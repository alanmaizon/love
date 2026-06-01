# Phase 1 — first deploy (staging or production)

**Prerequisite:** [Phase 0](PHASE0.md) complete (local donate path, tests green).

**Exit criterion:** A donor on the **public HTTPS site** completes Checkout; Stripe **webhooks** hit your API; the donation is **`confirmed`** with **ledger** + **outbox/receipt** — without `sync-checkout` (that endpoint is DEBUG-only).

Infra walkthrough: [DEPLOY.md](../DEPLOY.md).

---

## 1. Deploy API + frontend

Follow [DEPLOY.md](../DEPLOY.md) through **HTTPS** (Steps 3–5):

| Piece | URL |
|--------|-----|
| Frontend | `https://yourdomain.com` |
| API | `https://api.yourdomain.com` |

Set `DJANGO_SETTINGS_MODULE=config.settings.prod` on ECS (or equivalent).

Frontend build:

```bash
cd love_frontend
echo 'VITE_API_URL=https://api.yourdomain.com' > .env.production
npm ci && npm run build
```

Post-deploy on the API container:

```bash
python manage.py migrate
python manage.py import_donations --csv love_frontend/public/data/donations.csv   # optional seed
python manage.py createsuperuser   # or shell one-liner from PHASE0 troubleshooting
```

---

## 2. Secrets (SSM / env)

Add to Parameter Store (see DEPLOY Step 1) — **in addition** to `SECRET_KEY`, `DATABASE_URL`, CORS/CSRF, email, S3:

```bash
put STRIPE_SECRET_KEY        SecureString "sk_live_..."    # or sk_test_ for staging
put STRIPE_PUBLISHABLE_KEY   SecureString "pk_live_..."
put STRIPE_WEBHOOK_SECRET    SecureString "whsec_..."       # from Dashboard webhook (below)
put FRONTEND_URL             String       "https://yourdomain.com"
put PLATFORM_FEE_BPS         String       "0"
put STRIPE_CURRENCY          String       "eur"
```

Redeploy / restart tasks after changing secrets.

**Do not** use the `whsec_` from `stripe listen` in production — that is CLI-only for localhost.

---

## 3. Production Stripe webhooks (this phase)

Code is already live at:

```text
POST https://api.yourdomain.com/api/payments/webhook/
```

### Dashboard setup

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL:** `https://api.yourdomain.com/api/payments/webhook/`
3. **Events** (minimum):
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `account.updated`
4. Create endpoint → reveal **Signing secret** (`whsec_...`).
5. Put that value in SSM as `STRIPE_WEBHOOK_SECRET` and restart the API.
6. **Send test webhook** from the Dashboard → expect **200** in delivery log.

### Verify on a real Checkout (test mode on staging is fine)

1. Charity has a real Connect `acct_` with **charges enabled** (not a shared dev placeholder).
2. Donate on the public site with `4242 4242 4242 4242`.
3. Check:
   - Stripe → Webhooks → recent delivery **200**
   - Django admin → **Webhook events** (count &gt; 0, status `processed`)
   - Donation **`confirmed`**, **Ledger entries** present

```bash
# optional SSH/exec into task
python manage.py shell -c "
from payments.models import WebhookEvent
from donations.models import Donation
print('webhooks', WebhookEvent.objects.count())
print(Donation.objects.order_by('-id').values('id','status')[:3])
"
```

If money shows in Stripe but donations stay **pending**, the endpoint URL or signing secret is wrong, or the API is unreachable from Stripe.

---

## 4. Stripe Connect (per charity)

Phase 0 allowed one test `acct_` for all seed charities locally. **Production:** each verified charity should onboard to **its own** Connect account.

- Use `POST /api/payments/connect/` (authenticated charity admin) or Dashboard onboarding.
- Confirm `PayoutAccount.charges_enabled` before accepting live gifts.

---

## 5. What not to use in production

| Dev-only | Production |
|----------|------------|
| `stripe listen` | Dashboard webhook endpoint |
| `STRIPE_WEBHOOK_SECRET` from CLI | Dashboard signing secret |
| `POST /api/payments/sync-checkout/` | Webhooks only (DEBUG-gated off in prod) |
| SQLite | Postgres via `DATABASE_URL` |

---

## 6. Post-deploy smoke

- [ ] `https://api.yourdomain.com/api/analytics/` returns expected totals (if seeded).
- [ ] Admin loads over HTTPS (`/admin/`).
- [ ] One test Checkout → webhook 200 → donation `confirmed`.
- [ ] `drain_outbox` runs on a schedule or manually until receipts/email are automated (Phase 2+).

---

## Done when

- [ ] HTTPS frontend + API deployed
- [ ] Postgres migrated; prod settings (`DEBUG=False`, real `SECRET_KEY`)
- [ ] Dashboard webhook configured + `STRIPE_WEBHOOK_SECRET` in SSM
- [ ] Test donation: `WebhookEvent` processed, donation `confirmed`, ledger written
- [ ] At least one charity Connect-ready for real payouts (or staging test `acct_`)

---

## Next (Phase 2+)

- Scheduled **outbox** drain (receipts / SES email in prod)
- CI deploy workflow wired to your AWS account
- Per-charity Connect onboarding UX polish
- Monitoring on failed webhooks (`WebhookEvent.status=failed`)
