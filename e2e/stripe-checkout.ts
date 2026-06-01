import { expect, type FrameLocator, type Page } from '@playwright/test';

const TEST_CARD = '4242 4242 4242 4242';
const TEST_EXP = '12 / 34';
const TEST_CVC = '123';

/**
 * Complete Stripe-hosted Checkout in test mode (card 4242…).
 * EU accordion: expand Card via listitem / "Pay with card", then page textboxes or iframes.
 */
export async function completeStripeCheckout(page: Page, email: string) {
  await expect(page).toHaveURL(/checkout\.stripe\.com/);

  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailField.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await emailField.fill(email);
  }

  await expandCardPaymentForm(page);

  if (!(await fillAccessibleCardFields(page, 12_000))) {
    await fillStripeIframeFields(page);
  }

  await submitStripeCheckout(page);
  await page.waitForURL(/\/confirmation/, { timeout: 120_000 });
}

async function expandCardPaymentForm(page: Page) {
  const cardNumber = page.getByRole('textbox', { name: /card number/i });
  if (await cardNumber.isVisible({ timeout: 5_000 }).catch(() => false)) {
    return;
  }

  const cardRadio = page.getByRole('radio', { name: /^card$/i });
  if (!(await cardRadio.isVisible({ timeout: 15_000 }).catch(() => false))) {
    return;
  }

  const cardRow = page.getByRole('listitem').filter({ has: cardRadio });
  if (await cardRow.isVisible().catch(() => false)) {
    await cardRow.click();
  }
  await cardRadio.check().catch(() => cardRadio.click());

  const payWithCard = page.getByRole('button', { name: /pay with card/i });
  if (await payWithCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await payWithCard.click();
  }

  await cardNumber.waitFor({ state: 'visible', timeout: 30_000 });
}

async function fillAccessibleCardFields(page: Page, timeout = 15_000): Promise<boolean> {
  const cardNumber = page.getByRole('textbox', { name: /card number/i });
  try {
    await cardNumber.waitFor({ state: 'visible', timeout });
  } catch {
    return false;
  }
  await cardNumber.fill(TEST_CARD);
  await page.getByRole('textbox', { name: /expiration/i }).fill(TEST_EXP);
  await page.getByRole('textbox', { name: /^cvc$/i }).fill(TEST_CVC);

  const cardholder = page.getByRole('textbox', { name: /cardholder name/i });
  if (await cardholder.isVisible().catch(() => false)) {
    await cardholder.fill('E2E Donor');
  }
  return true;
}

async function fillStripeIframeFields(page: Page) {
  await page
    .locator(
      'iframe[title*="Secure" i], iframe[name*="privateStripeFrame" i], iframe[src*="js.stripe.com" i]'
    )
    .first()
    .waitFor({ state: 'attached', timeout: 30_000 });

  const strategies: Array<() => Promise<void>> = [
    () => fillPerFieldTitleFrames(page),
    () => fillPrivateStripeFrames(page),
    () => fillCombinedStripeFrame(page),
  ];

  let lastErr: unknown;
  for (const run of strategies) {
    try {
      await run();
      return;
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(
    `Could not fill Stripe card iframes on ${page.url()}. Last error: ${lastErr}`
  );
}

async function fillPerFieldTitleFrames(page: Page) {
  await fillInFrame(
    page.frameLocator('iframe[title*="Secure card number" i]').first(),
    ['input[name="cardnumber"]', '[placeholder*="1234" i]', '[autocomplete="cc-number"]'],
    TEST_CARD
  );
  await fillInFrame(
    page.frameLocator('iframe[title*="expiration" i]').first(),
    ['input[name="exp-date"]', '[placeholder*="MM" i]', '[autocomplete="cc-exp"]'],
    '1234'
  );
  await fillInFrame(
    page.frameLocator('iframe[title*="CVC" i]').first(),
    ['input[name="cvc"]', '[placeholder*="CVC" i]', '[autocomplete="cc-csc"]'],
    TEST_CVC
  );
}

async function fillPrivateStripeFrames(page: Page) {
  const frames = page.locator('iframe[name*="privateStripeFrame" i]');
  const count = await frames.count();
  if (count === 0) {
    throw new Error('No __privateStripeFrame iframes');
  }

  let filledNumber = false;
  for (let i = 0; i < count; i++) {
    const frame = page.frameLocator('iframe[name*="privateStripeFrame" i]').nth(i);
    if (!filledNumber) {
      try {
        await fillInFrame(frame, ['[placeholder*="1234" i]', 'input[name="cardnumber"]'], TEST_CARD);
        filledNumber = true;
      } catch {
        /* try next frame */
      }
    }
    try {
      await fillInFrame(frame, ['[placeholder*="MM" i]', 'input[name="exp-date"]'], '1234');
    } catch {
      /* separate frame */
    }
    try {
      await fillInFrame(frame, ['[placeholder*="CVC" i]', 'input[name="cvc"]'], TEST_CVC);
    } catch {
      /* separate frame */
    }
  }
  if (!filledNumber) {
    throw new Error('Card number iframe not found');
  }
}

async function fillCombinedStripeFrame(page: Page) {
  const frame = page.frameLocator('iframe[src*="js.stripe.com" i]').first();
  await fillInFrame(frame, ['input[name="cardnumber"]', '[placeholder*="Card number" i]'], TEST_CARD);
  await fillInFrame(frame, ['input[name="exp-date"]', '[placeholder*="MM" i]'], '1234');
  await fillInFrame(frame, ['input[name="cvc"]', '[placeholder*="CVC" i]'], TEST_CVC);
}

async function fillInFrame(frame: FrameLocator, selectors: string[], value: string) {
  for (const sel of selectors) {
    const field = frame.locator(sel).first();
    if (await field.count()) {
      await field.waitFor({ state: 'visible', timeout: 15_000 });
      await field.fill(value);
      return;
    }
  }
  throw new Error(`No matching field in frame for ${selectors.join(', ')}`);
}

async function submitStripeCheckout(page: Page) {
  const submit = page.getByTestId('hosted-payment-submit-button');
  if (await submit.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await submit.click();
    return;
  }
  await page.getByRole('button', { name: /^pay$/i }).click();
}
