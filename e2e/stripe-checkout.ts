import { expect, type Page } from '@playwright/test';

/**
 * Complete Stripe-hosted Checkout in test mode (card 4242…).
 * EU accordion UI exposes Card number / Expiration / CVC as page textboxes when Card is expanded.
 */
export async function completeStripeCheckout(page: Page, email: string) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 90_000 });

  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(email);
  }

  const cardRow = page.getByRole('listitem').filter({
    has: page.getByRole('radio', { name: /^card$/i }),
  });
  await cardRow.click();
  await page.getByRole('radio', { name: /^card$/i }).check();

  const cardNumber = page.getByRole('textbox', { name: /card number/i });
  await expect(cardNumber).toBeVisible({ timeout: 30_000 });
  await cardNumber.fill('4242 4242 4242 4242');

  await page.getByRole('textbox', { name: /expiration/i }).fill('12 / 34');
  await page.getByRole('textbox', { name: /^cvc$/i }).fill('123');

  const cardholder = page.getByRole('textbox', { name: /cardholder name/i });
  if (await cardholder.isVisible().catch(() => false)) {
    await cardholder.fill('E2E Donor');
  }

  const submit = page.getByTestId('hosted-payment-submit-button');
  if (await submit.isVisible().catch(() => false)) {
    await submit.click();
  } else {
    await page.getByRole('button', { name: /^pay$/i }).click();
  }

  await page.waitForURL(/\/confirmation/, { timeout: 120_000 });
}
