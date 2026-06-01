import { expect, type Page } from '@playwright/test';

/** DEBUG sync-checkout — confirms donation + pending guestbook when webhooks miss localhost. */
export async function ensureDonationConfirmed(page: Page, apiOrigin: string) {
  const sessionId = new URL(page.url()).searchParams.get('session_id');
  if (!sessionId?.startsWith('cs_')) {
    throw new Error(`Missing session_id on confirmation URL: ${page.url()}`);
  }

  await page.request.get(`${apiOrigin}/api/csrf/`);
  const csrf =
    (await page.context().cookies(apiOrigin)).find((c) => c.name === 'csrftoken')?.value ?? '';

  await expect
    .poll(async () => {
      const res = await page.request.post(`${apiOrigin}/api/payments/sync-checkout/`, {
        data: { session_id: sessionId },
        headers: {
          'X-CSRFToken': csrf,
          Referer: apiOrigin,
          Origin: apiOrigin,
        },
      });
      if (!res.ok()) return false;
      const body = await res.json();
      return body.status === 'confirmed';
    }, { timeout: 90_000 })
    .toBeTruthy();
}
