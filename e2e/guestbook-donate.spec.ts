import { test, expect } from '@playwright/test';
import { loginHost } from './auth';
import { ensureDonationConfirmed } from './checkout-sync';
import { approveGuestbookMessage } from './moderate';
import { completeStripeCheckout } from './stripe-checkout';

const CAMPAIGN_SLUG = process.env.E2E_CAMPAIGN_SLUG || 'anna-and-alan';
const HOST_USER = process.env.E2E_HOST_USERNAME || 'anna_alan';
const HOST_PASS = process.env.E2E_HOST_PASSWORD || 'e2e-test-pass-12!';
const API_URL = process.env.E2E_API_URL || process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('Guestbook donate (live Stripe)', () => {
  test('donate with message → host approves → public guestbook', async ({ page, request }) => {
    const uniqueMessage = `E2E guestbook ${Date.now()}`;
    const donorEmail = `e2e-donor-${Date.now()}@example.com`;

    await page.goto(`/donate?campaign=${CAMPAIGN_SLUG}`);
    await expect(page.getByRole('heading', { name: /make a gift/i })).toBeVisible();

    await page.locator('#donorName').fill('E2E Donor');
    await page.locator('#donorEmail').fill(donorEmail);
    await page.getByRole('radio', { name: '€20', exact: true }).check();
    await page.locator('#charity').selectOption({ index: 1 });
    await page.locator('#message').fill(uniqueMessage);

    await page.getByRole('button', { name: /send gift/i }).click();

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
    await messageRow.getByRole('button', { name: /^approve$/i }).click();
    await expect
      .poll(async () => {
        const badge = messageRow.locator('.badge');
        if ((await badge.textContent())?.trim() === 'approved') return true;
        await approveGuestbookMessage(page, CAMPAIGN_SLUG, uniqueMessage);
        await page.reload();
        const row = page.getByRole('listitem').filter({ hasText: uniqueMessage });
        return (await row.locator('.badge').textContent())?.trim() === 'approved';
      }, { timeout: 20_000 })
      .toBeTruthy();

    await page.goto(`/c/${CAMPAIGN_SLUG}`);
    await expect(page.getByText(uniqueMessage)).toBeVisible({ timeout: 30_000 });
  });
});
