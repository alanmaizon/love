import { expect, type Page } from '@playwright/test';
import { loginHost } from './auth';

interface GuestbookFlowOpts {
  apiUrl: string;
  campaignSlug: string;
  hostUser: string;
  hostPass: string;
  message: string;
}

/**
 * Shared tail of the guestbook journey (identical for the decoupled CI test and
 * the live Stripe-UI test): a confirmed donation has created a PENDING guestbook
 * message; the host logs in, approves it on the manage page, and it becomes
 * publicly visible.
 */
export async function approveAndVerifyPublic(page: Page, opts: GuestbookFlowOpts) {
  const { apiUrl, campaignSlug, hostUser, hostPass, message } = opts;

  await loginHost(page, hostUser, hostPass);
  await expect
    .poll(async () => {
      const me = await page.request.get(`${apiUrl}/api/me/`);
      if (!me.ok()) return false;
      const body = await me.json();
      return body.authenticated === true;
    })
    .toBeTruthy();

  // Host sees pending messages on the guestbook/moderation feed.
  await expect
    .poll(
      async () => {
        const res = await page.request.get(
          `${apiUrl}/api/campaigns/${encodeURIComponent(campaignSlug)}/guestbook/`
        );
        if (!res.ok()) return false;
        const list = await res.json();
        return (
          Array.isArray(list) && list.some((m: { body?: string }) => m.body === message)
        );
      },
      { timeout: 60_000 }
    )
    .toBeTruthy();

  await page.goto(`/dashboard/campaigns/${campaignSlug}`);
  await expect(page).toHaveURL(new RegExp(`/dashboard/campaigns/${campaignSlug}`));
  await expect(page.getByRole('heading', { name: /manage registry/i })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('heading', { name: /guestbook moderation/i })).toBeVisible();

  const messageRow = page.getByRole('listitem').filter({ hasText: message });
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
    `Approve PATCH failed (${patchRes.status()}): ${await patchRes.text()}`
  ).toBeTruthy();

  await expect
    .poll(
      async () => {
        const row = page.getByRole('listitem').filter({ hasText: message });
        return (await row.locator('.badge').textContent())?.trim() === 'approved';
      },
      { timeout: 15_000 }
    )
    .toBeTruthy();

  await page.goto(`/c/${campaignSlug}`);
  await expect(page.getByText(message)).toBeVisible({ timeout: 30_000 });
}
