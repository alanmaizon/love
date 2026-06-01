# Guestbook flow — test coverage

End-to-end product path: **donate with message → confirm (webhook or dev sync) → host moderates → public guestbook**.

## Run all guestbook tests

```bash
# Backend (API + webhook + sync-checkout + smoke)
cd love_backend
. .venv/bin/activate
DJANGO_SETTINGS_MODULE=config.settings.dev python manage.py test \
  payments.tests.WebhookProcessingTests \
  payments.tests.GuestbookWebhookIntegrationTests \
  payments.tests.FullGuestbookFlowTests \
  payments.tests.SyncCheckoutGuestbookTests \
  payments.tests.SmokeDonateFlowTests \
  donations.tests.OnboardingFlowTests.test_guest_message_pending_then_host_approves

# Frontend (Vitest)
cd ../love_frontend
npm test -- --run \
  test/DonationForm.test.jsx \
  test/DonationConfirmation.test.jsx \
  test/CampaignManage.test.jsx \
  test/HomeGuestbookSection.test.jsx \
  test/GuestMessages.test.jsx \
  test/CampaignPage.test.jsx \
  test/usePublicCampaign.test.js
```

## What each layer covers

| Layer | Tests |
|--------|--------|
| Webhook unit | Message create, empty skip, anonymous name |
| Checkout → webhook → approve | `FullGuestbookFlowTests`, `GuestbookWebhookIntegrationTests` |
| Dev `sync-checkout` | `SyncCheckoutGuestbookTests` |
| Smoke command | `SmokeDonateFlowTests` + pending message |
| Host moderate API | `test_guest_message_pending_then_host_approves` |
| Donate form payload | `DonationForm.test.jsx` |
| Thank-you sync | `DonationConfirmation.test.jsx` |
| Manage UI | `CampaignManage.test.jsx` |
| Public carousel | `HomeGuestbookSection`, `GuestMessages`, `CampaignPage` |
| Campaign loader | `usePublicCampaign.test.js` |

## Manual check (real Stripe)

```bash
# Terminal A
cd love_backend && python manage.py runserver

# Terminal B
stripe listen --forward-to localhost:8000/api/payments/webhook/

# Terminal C
cd love_frontend && npm run dev
```

1. Donate at `/donate?campaign=<slug>` with a message.
2. Complete Checkout (`4242…`).
3. Dashboard → manage registry → guestbook shows **pending** → Approve.
4. Home / `/c/<slug>` / `/messages` show the message.

If webhooks do not hit localhost, thank-you page uses `sync-checkout` (DEBUG only).

## Browser E2E (Playwright + live Stripe test mode)

From repo root (requires `love_backend/.env` with real `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY`; Connect `acct_` is auto-discovered if `E2E_STRIPE_ACCOUNT_ID` is unset):

```bash
npm install
npm run e2e:install
npm run e2e
```

`e2e_prepare` runs in global setup (migrate, seed, wire Connect, reset `anna_alan` password). The spec donates with message `4242…` on `checkout.stripe.com`, syncs via thank-you (`DEBUG`), host approves on manage, asserts public API + campaign page.

Skip bundled servers if Django and Vite are already up:

```bash
E2E_SKIP_WEBSERVER=1 npm run e2e
```

Artifacts: `playwright-report/`, `test-results/` (gitignored).

## CI (optional)

Workflow [`.github/workflows/e2e-guestbook.yml`](../.github/workflows/e2e-guestbook.yml) runs on **workflow_dispatch** when these repository secrets are set:

- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- Optional: `E2E_STRIPE_ACCOUNT_ID`, `E2E_HOST_PASSWORD`

`e2e_prepare` deletes prior rows whose body starts with `E2E guestbook ` so the manage UI stays uncluttered.

## Not automated

- Email receipt content.
