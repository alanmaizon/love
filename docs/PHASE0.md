# Phase 0 — stabilize (checklist)

Exit criterion: **one person can donate on localhost without admin clicking “confirm”.**

## 1. Database

```bash
cd love_backend
source venv/bin/activate   # or: python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export DJANGO_SETTINGS_MODULE=config.settings.dev
python manage.py migrate
python manage.py import_donations --csv ../love_frontend/public/data/donations.csv
```

## 2. Automated smoke (no Stripe network)

```bash
python manage.py smoke_donate_flow --drain
```

Expect: pending donation → confirmed → ledger row → outbox → receipt.

## 3. Backend tests

```bash
python manage.py test donations payments
```

## 4. Frontend tests

```bash
cd ../love_frontend && npm ci && npm test -- --run
```

## 5. Manual Stripe test (required for `confirmed` via Checkout)

**Checkout returning success still leaves the donation `pending` until a webhook runs.**

Stripe does not call your laptop by itself. You need the **Stripe CLI** forwarding events:

```bash
# Terminal B (keep running while testing)
stripe listen --forward-to localhost:8000/api/payments/webhook/
```

Copy the **`whsec_...`** line into `love_backend/.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Restart `runserver`** after changing `.env`. Each new `stripe listen` session prints a **new** `whsec_` — an old secret causes `400 invalid signature` and **zero** `WebhookEvent` rows.

Quick check:

```bash
python manage.py check_stripe_webhook
```

In the runserver terminal you should see after paying:

`POST /api/payments/webhook/ 200`

**Money in the Stripe Dashboard but donations still `pending`?** The payment succeeded on
Stripe’s servers; your laptop did not receive the webhook (`WebhookEvent` count stays 0).
A Dashboard webhook signing secret does **not** forward events to `localhost` — you still
need `stripe listen`, **or** (DEBUG only) the app confirms from `?session_id=cs_...` on the
thank-you page via `POST /api/payments/sync-checkout/`.

Recover one stuck donation manually:

```bash
python manage.py confirm_checkout_session cs_xxxxxxxx
```

(`cs_` from the thank-you URL or Stripe Dashboard → Payments → Checkout sessions.)

## 5b. Manual Stripe test (detail)

Checkout needs a **real** test-mode Connect account id (`acct_…`), not the old
`acct_smoke_test` placeholder from `smoke_donate_flow`.

1. Add Stripe **test** keys to `love_backend/.env` (see `.env.example`).
2. If you ran smoke before this was fixed:
   ```bash
   python manage.py repair_placeholder_payouts
   ```
3. Attach one test Connect account to all seed charities (same `acct_` is fine locally):
   - Stripe Dashboard → **Connect** → create / open a test connected account, copy `acct_…`
   - Or: `stripe accounts create --type=express` (CLI)
   ```bash
   python manage.py migrate   # needs 0010 if you hit UNIQUE on stripe_account_id
   python manage.py wire_stripe_account acct_YOUR_ID
   ```
   Re-importing the CSV is optional; `wire_stripe_account` is enough if data is already seeded.
4. Terminal A: `python manage.py runserver`
5. Terminal B: `stripe listen --forward-to localhost:8000/api/payments/webhook/`
6. Copy `whsec_…` into `STRIPE_WEBHOOK_SECRET`, restart runserver.
7. Terminal C: `cd love_frontend && npm run dev`
8. Open http://localhost:5173/donate — complete Checkout with test card `4242 4242 4242 4242`.
9. Verify in admin: donation `confirmed`, **Ledger entries**, **Webhook events** processed.

If checkout returns 400, read the JSON `error` field — it now explains missing/invalid `acct_` ids instead of a 500.

## 6. API contract

See [API_V2.md](./API_V2.md) for CSRF, register/login, and checkout payload changes.

## Troubleshooting

### `'super' object has no attribute 'dicts'` (Django admin)

**Cause:** Django **5.1.x** on **Python 3.14** — template context copy is broken; any `/admin/` list page can crash.

**Fix:** Upgrade Django in the venv (project pins **5.2.14+**):

```bash
cd love_backend && . .venv/bin/activate
pip install -r requirements.txt
```

**Alternative:** Recreate the venv with **Python 3.12** instead of 3.14.

### `Failed to build psycopg2-binary`

**Cause:** Old pin (`2.9.10`) has no wheel for **Python 3.14** on macOS ARM — pip falls back to a source build and fails.

**Fix:** `pip install -r requirements.txt` (project uses `psycopg2-binary>=2.9.12`). Local Phase 0 uses **SQLite** by default; Postgres driver is only needed when `DATABASE_URL` points at RDS.

**Create a superuser without the admin UI** (if `createsuperuser` is awkward):

```bash
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'changeme')
    print('created admin / changeme')
else:
    print('admin user already exists')
"
```

## Done when

- [ ] `smoke_donate_flow --drain` succeeds
- [ ] Backend + frontend test suites green
- [ ] One manual donate completes via Stripe webhook (or smoke command if keys unavailable)
