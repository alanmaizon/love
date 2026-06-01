import { test, expect } from '@playwright/test';
import { loginHost } from './auth';
import { ensureDonationConfirmed } from './checkout-sync';
import { submitDonationAndReachStripe } from './start-checkout';
import { completeStripeCheckout } from './stripe-checkout';

const CAMPAIGN_SLUG = process.env.E2E_CAMPAIGN_SLUG || 'anna-and-alan';
const HOST_USER = process.env.E2E_HOST_USERNAME || 'anna_alan';
const HOST_PASS = process.env.E2E_HOST_PASSWORD || 'e2e-test-pass-12!';
const API_URL = process.env.E2E_API_URL || process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('Guestbook donate (live Stripe)', () => {
  test('donate with message → host approves → public guestbook', async ({ page }) => {
    const uniqueMessage = `E2E guestbook ${Date.now()}`;
    const donorEmail = `e2e-donor-${Date.now()}@example.com`;

    await page.goto(`/donate?campaign=${CAMPAIGN_SLUG}`);
    await expect(page.getByRole('heading', { name: /make a gift/i })).toBeVisible();

    await page.locator('#donorName').fill('E2E Donor');
    await page.locator('#donorEmail').fill(donorEmail);
    await page.getByRole('radio', { name: '€20', exact: true }).check();
    const charityValue = await page
      .locator('#charity option[value]:not([value=""])')
      .first()
      .getAttribute('value');
    await page.locator('#charity').selectOption(charityValue!);
    await page.locator('#message').fill(uniqueMessage);

    await submitDonationAndReachStripe(page);
    await completeStripeCheckout(page, donorEmail);

    await expect(page.getByText(/thank you/i)).toBeVisible();
    await expect(page).toHaveURL(/session_id=cs_/);
    await ensureDonationConfirmed(page, API_URL);

    await loginHost(page, HOST_USER, HOST_PASS);
    await expect
      .poll(async () => {
        const me = await page.request.get(`${API_URL}/api/me/`);
        if (!me.ok()) return false;
        const body = await me.json();
        return body.authenticated === true;
      })
      .toBeTruthy();

    await expect
      .poll(async () => {
        const res = await page.request.get(
          `${API_URL}/api/campaigns/${encodeURIComponent(CAMPAIGN_SLUG)}/guestbook/`
        );
        if (!res.ok()) return false;
        const list = await res.json();
        return (
          Array.isArray(list) &&
          list.some((m: { body?: string }) => m.body === uniqueMessage)
        );
      }, { timeout: 60_000 })
      .toBeTruthy();

    await page.goto(`/dashboard/campaigns/${CAMPAIGN_SLUG}`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/campaigns/${CAMPAIGN_SLUG}`));
    await expect(page.getByRole('heading', { name: /manage registry/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: /guestbook moderation/i })).toBeVisible();
    const messageRow = page.getByRole('listitem').filter({ hasText: uniqueMessage });
    await expect(messageRow).toBeVisible();
    const approveBtn = messageRow.getByRole('button', { name: /^approve$/i });

    const [patchRes] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/moderate/') && res.request().method() === 'PATCH',
        { timeout: 45_000 }
      ),
      approveBtn.click(),
    ]);
    expect(
      patchRes.ok(),
      `Approve PATCH failed (${patchRes.status()}): ${await patchRes.text()}. ` +
        'If using E2E_SKIP_WEBSERVER=1, start Vite with: ' +
        'VITE_API_URL=http://localhost:5173 npm run dev -- --port 5173'
    ).toBeTruthy();

    await expect
      .poll(async () => {
        const row = page.getByRole('listitem').filter({ hasText: uniqueMessage });
        return (await row.locator('.badge').textContent())?.trim() === 'approved';
      }, { timeout: 15_000 })
      .toBeTruthy();

    await page.goto(`/c/${CAMPAIGN_SLUG}`);
    await expect(page.getByText(uniqueMessage)).toBeVisible({ timeout: 30_000 });
  });
});
