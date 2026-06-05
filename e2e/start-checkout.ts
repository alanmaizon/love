import { expect, type Page } from '@playwright/test';

interface CheckoutResult {
  donationId: number;
  checkoutUrl: string;
}

/** Fill the donate form (€20, first verified charity, given message). */
export async function fillDonateForm(page: Page, donorEmail: string, message: string) {
  await expect(page.getByRole('heading', { name: /make a gift/i })).toBeVisible();
  await page.locator('#donorName').fill('E2E Donor');
  await page.locator('#donorEmail').fill(donorEmail);
  await page.getByRole('radio', { name: '€20', exact: true }).check();
  const charityValue = await page
    .locator('#charity option[value]:not([value=""])')
    .first()
    .getAttribute('value');
  await page.locator('#charity').selectOption(charityValue!);
  await page.locator('#message').fill(message);
}

/**
 * Submit the donate form and capture the checkout API result WITHOUT loading
 * Stripe's hosted Checkout page.
 *
 * Driving Stripe's hosted UI in headless CI is unreliable — Stripe flags
 * datacenter/automated traffic with an agent-identity challenge and never
 * completes the charge. Instead we assert the backend created a valid Checkout
 * Session (proves params + idempotency) and return donation_id so the test can
 * confirm the donation through the real webhook code path. The redirect to
 * checkout.stripe.com is aborted so the page stays put.
 */
export async function submitDonationForCheckout(page: Page): Promise<CheckoutResult> {
  await expect(page.getByText(/supporting:/i)).toBeVisible({ timeout: 30_000 });
  await expect(
    page.locator('#charity option[value]:not([value=""])')
  ).not.toHaveCount(0, { timeout: 30_000 });

  // Intercept the checkout POST so we can read the body reliably (reading a
  // page response after window.location.href navigates away yields an empty
  // body) and neutralize the Stripe redirect (drop checkout_url) so the page
  // stays on /donate.
  let status = 0;
  let body: { checkout_url?: string; donation_id?: number; error?: string } = {};
  let captured = false;

  await page.route('**/api/payments/checkout/', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const resp = await route.fetch();
    status = resp.status();
    try {
      body = await resp.json();
    } catch {
      body = {};
    }
    captured = true;
    await route.fulfill({ status, json: { ...body, checkout_url: undefined } });
  });

  await page.getByRole('button', { name: /send gift/i }).click();
  await expect.poll(() => captured, { timeout: 60_000 }).toBeTruthy();
  await page.unroute('**/api/payments/checkout/');

  if (status < 200 || status >= 300) {
    const detail =
      typeof body.error === 'string' ? body.error : JSON.stringify(body) || '(empty body)';
    throw new Error(`Checkout API failed (${status}): ${detail}`);
  }

  expect(
    body.checkout_url,
    `Response missing checkout_url (status ${status}, body: ${JSON.stringify(body)})`
  ).toEqual(expect.stringMatching(/^https:\/\/checkout\.stripe\.com\//));
  expect(body.donation_id, 'Response missing donation_id').toBeTruthy();

  return { donationId: body.donation_id!, checkoutUrl: body.checkout_url! };
}

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
