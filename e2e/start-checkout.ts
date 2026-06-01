import { expect, type Page } from '@playwright/test';

/**
 * Submit the donate form and reach Stripe Checkout.
 * Reads the checkout API response before/alongside redirect (body is often empty
 * after window.location.href if read too late).
 */
export async function submitDonationAndReachStripe(page: Page) {
  await expect(page.getByText(/supporting:/i)).toBeVisible({ timeout: 30_000 });
  await expect(
    page.locator('#charity option[value]:not([value=""])')
  ).not.toHaveCount(0, { timeout: 30_000 });

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/api/payments/checkout/') &&
        res.request().method() === 'POST',
      { timeout: 60_000 }
    ),
    page.getByRole('button', { name: /send gift/i }).click(),
  ]);

  if (!response.ok()) {
    let detail = '';
    try {
      const body = await response.json();
      detail = typeof body?.error === 'string' ? body.error : JSON.stringify(body);
    } catch {
      detail = await response.text().catch(() => '(unreadable body)');
    }
    throw new Error(`Checkout API failed (${response.status()}): ${detail}`);
  }

  try {
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 90_000 });
  } catch {
    const alert = (await page.getByRole('alert').textContent())?.trim();
    let bodySnippet = '';
    try {
      bodySnippet = await response.text();
    } catch {
      bodySnippet = '(response body unavailable after navigation)';
    }
    throw new Error(
      `Never reached Stripe Checkout (checkout POST ${response.status()}). ` +
        `Page alert: ${alert || '(none)'}. Response: ${bodySnippet.slice(0, 300)}`
    );
  }
}
