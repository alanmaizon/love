import { expect, type Page } from '@playwright/test';

const WEB_ORIGIN = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
const API_URL = process.env.E2E_API_URL || WEB_ORIGIN;

/** Session login via API (reliable CSRF cookies in Playwright vs SPA form). */
export async function loginHost(
  page: Page,
  username = process.env.E2E_HOST_USERNAME || 'anna_alan',
  password = process.env.E2E_HOST_PASSWORD || 'e2e-test-pass-12!'
) {
  await page.evaluate(() => localStorage.removeItem('loggedOut'));

  const csrfRes = await page.request.get(`${API_URL}/api/csrf/`);
  expect(csrfRes.ok()).toBeTruthy();

  const csrfCookie = (await page.context().cookies(API_URL)).find((c) => c.name === 'csrftoken');
  const csrf = csrfCookie?.value ?? '';

  const loginRes = await page.request.post(`${API_URL}/api/login/`, {
    data: { username, password },
    headers: {
      'X-CSRFToken': csrf,
      Referer: WEB_ORIGIN,
    },
  });
  expect(loginRes.ok(), `login failed: ${await loginRes.text()}`).toBeTruthy();
  // page.request shares sessionid/csrftoken cookies with this browser context for API calls.
}
