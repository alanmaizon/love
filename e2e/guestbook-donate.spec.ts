import { test, expect } from '@playwright/test';
import { fillDonateForm, submitDonationForCheckout } from './start-checkout';
import { approveAndVerifyPublic } from './guestbook-flow';

const CAMPAIGN_SLUG = process.env.E2E_CAMPAIGN_SLUG || 'anna-and-alan';
const HOST_USER = process.env.E2E_HOST_USERNAME || 'anna_alan';
const HOST_PASS = process.env.E2E_HOST_PASSWORD || 'e2e-test-pass-12!';
const API_URL = process.env.E2E_API_URL || process.env.E2E_BASE_URL || 'http://localhost:5173';

/**
 * Deterministic CI flow: assert the backend creates a valid Stripe Checkout
 * Session, confirm the donation through the real webhook code path (no Stripe
 * hosted UI), then exercise the product logic in a real browser:
 * pending guestbook message → host approves → public guestbook.
 *
 * The full Stripe-hosted Checkout UI walk lives in guestbook-donate.live.spec.ts
 * (tagged @live) and is excluded from CI because Stripe blocks headless traffic.
 */
test.describe('Guestbook donate (decoupled)', () => {
  test('donate → confirm → host approves → public guestbook', async ({ page }) => {
    const uniqueMessage = `E2E guestbook ${Date.now()}`;
    const donorEmail = `e2e-donor-${Date.now()}@example.com`;

    await page.goto(`/donate?campaign=${CAMPAIGN_SLUG}`);
    await fillDonateForm(page, donorEmail, uniqueMessage);

    const { donationId, checkoutUrl } = await submitDonationForCheckout(page);
    expect(checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//);

    await page.request.get(`${API_URL}/api/csrf/`);
    const csrf =
      (await page.context().cookies(API_URL)).find((c) => c.name === 'csrftoken')?.value ?? '';
    const confirmRes = await page.request.post(`${API_URL}/api/payments/e2e-confirm/`, {
      data: { donation_id: donationId },
      headers: { 'X-CSRFToken': csrf, Referer: API_URL, Origin: API_URL },
    });
    expect(
      confirmRes.ok(),
      `e2e-confirm failed (${confirmRes.status()}): ${await confirmRes.text()}. ` +
        'Ensure the backend runs with DEBUG=True and E2E_TEST_HOOKS=1.'
    ).toBeTruthy();
    expect((await confirmRes.json()).status).toBe('confirmed');

    await approveAndVerifyPublic(page, {
      apiUrl: API_URL,
      campaignSlug: CAMPAIGN_SLUG,
      hostUser: HOST_USER,
      hostPass: HOST_PASS,
      message: uniqueMessage,
    });
  });
});
