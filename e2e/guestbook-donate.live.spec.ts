import { test, expect } from '@playwright/test';
import { fillDonateForm, submitDonationAndReachStripe } from './start-checkout';
import { completeStripeCheckout } from './stripe-checkout';
import { ensureDonationConfirmed } from './checkout-sync';
import { approveAndVerifyPublic } from './guestbook-flow';

const CAMPAIGN_SLUG = process.env.E2E_CAMPAIGN_SLUG || 'anna-and-alan';
const HOST_USER = process.env.E2E_HOST_USERNAME || 'anna_alan';
const HOST_PASS = process.env.E2E_HOST_PASSWORD || 'e2e-test-pass-12!';
const API_URL = process.env.E2E_API_URL || process.env.E2E_BASE_URL || 'http://localhost:5173';

/**
 * Full live Stripe-hosted Checkout walk (card 4242…). Tagged @live and EXCLUDED
 * from CI (Stripe flags headless/datacenter traffic with an agent challenge and
 * never completes the charge). Run locally with: npm run e2e:live
 */
test.describe('Guestbook donate (live Stripe) @live', () => {
  test('@live donate via Stripe UI → host approves → public guestbook', async ({ page }) => {
    const uniqueMessage = `E2E guestbook ${Date.now()}`;
    const donorEmail = `e2e-donor-${Date.now()}@example.com`;

    await page.goto(`/donate?campaign=${CAMPAIGN_SLUG}`);
    await fillDonateForm(page, donorEmail, uniqueMessage);

    await submitDonationAndReachStripe(page);
    await completeStripeCheckout(page, donorEmail);

    await expect(page.getByText(/thank you/i)).toBeVisible();
    await expect(page).toHaveURL(/session_id=cs_/);
    await ensureDonationConfirmed(page, API_URL);

    await approveAndVerifyPublic(page, {
      apiUrl: API_URL,
      campaignSlug: CAMPAIGN_SLUG,
      hostUser: HOST_USER,
      hostPass: HOST_PASS,
      message: uniqueMessage,
    });
  });
});
