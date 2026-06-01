import { expect, type Page } from '@playwright/test';

/**
 * Click Send Gift, assert checkout API succeeds, then land on Stripe Checkout.
 * Uses the API checkout_url when the in-page redirect is slow or missing (common in CI).
 */
export async function submitDonationAndReachStripe(page: Page) {
  await expect(page.getByText(/supporting:/i)).toBeVisible({ timeout: 30_000 });
  await expect(
    page.locator('#charity option[value]:not([value=""])')
  ).not.toHaveCount(0, { timeout: 30_000 });

  const checkoutResponse = page.waitForResponse(
    (res) =>
      res.url().includes('/payments/checkout/') &&
      res.request().method() === 'POST',
    { timeout: 60_000 }
  );

  await page.getByRole('button', { name: /send gift/i }).click();

  const response = await checkoutResponse;
  let body: { checkout_url?: string; error?: string } = {};
  try {
    body = await response.json();
  } catch {
    /* non-JSON error page */
  }
  const detail =
    typeof body.error === 'string'
      ? body.error
      : (await response.text().catch(() => '')) || '(empty body)';

  expect(
    response.ok(),
    `Checkout API failed (${response.status()}): ${detail}`
  ).toBeTruthy();

  const checkoutUrl = body.checkout_url;
  expect(
    checkoutUrl,
    `Response missing checkout_url (status ${response.status()}, body: ${JSON.stringify(body)})`
  ).toEqual(expect.stringMatching(/^https:\/\/checkout\.stripe\.com\//));

  if (!/checkout\.stripe\.com/.test(page.url())) {
    await page.goto(checkoutUrl!, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });
  }
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
}
