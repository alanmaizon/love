import { expect, type Page } from '@playwright/test';

const WEB_ORIGIN = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL || WEB_ORIGIN;

export async function approveGuestbookMessage(page: Page, campaignSlug: string, body: string) {
  const guestbookRes = await page.request.get(
    `${API_URL}/api/campaigns/${encodeURIComponent(campaignSlug)}/guestbook/`
  );
  expect(guestbookRes.ok()).toBeTruthy();
  const list = await guestbookRes.json();
  const msg = Array.isArray(list) ? list.find((m: { body?: string }) => m.body === body) : null;
  expect(msg?.id, `pending message not found: ${body}`).toBeTruthy();

  await page.request.get(`${API_URL}/api/csrf/`);
  const csrf =
    (await page.context().cookies(API_URL)).find((c) => c.name === 'csrftoken')?.value ?? '';

  const patchRes = await page.request.patch(
    `${API_URL}/api/campaigns/${encodeURIComponent(campaignSlug)}/moderate/`,
    {
      data: { message_id: msg.id, action: 'approve' },
      headers: { 'X-CSRFToken': csrf, Referer: WEB_ORIGIN, Origin: WEB_ORIGIN },
    }
  );
  expect(patchRes.ok(), `moderate failed: ${await patchRes.text()}`).toBeTruthy();
}
