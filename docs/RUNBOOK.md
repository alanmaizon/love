# Operations runbook — Love That Gives Back

For Phase 3 money ops commands see [PHASE3.md](PHASE3.md).

---

## Daily / automated

1. **Outbox** — `drain_outbox` every 5 minutes (Terraform EventBridge → ECS, or cron).
2. **Health** — `ops_health` daily; investigate any failed `WebhookEvent` or stuck `OutboxEvent`.
3. **Reconcile** — `reconcile_stripe --since-days 30` daily; fix drift before it compounds.

---

## New donation stuck on `pending`

| Symptom | Likely cause | Action |
|---------|----------------|--------|
| Stripe Dashboard shows paid, DB `pending` | Webhook not delivered or wrong `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → resend event; fix SSM secret; restart ECS |
| Local dev | No `stripe listen` | Run `stripe listen --forward-to localhost:8000/api/payments/webhook/` or DEBUG `sync-checkout` |
| Prod | 4xx/5xx on webhook URL | Check ALB health `/health/`, ECS logs, `ops_health` |

**Recovery (one donation):**

```bash
python manage.py confirm_checkout_session cs_xxxxxxxx
python manage.py drain_outbox
```

Never bulk “Mark as Confirmed” in admin for production money — no ledger rows are created.

---

## Charity not payout-ready (checkout 400)

Host sees error about Connect / `acct_`.

1. Charity admin completes Stripe Connect (`/onboarding/charity` or Connect link).
2. Django admin → **Payout accounts** → `charges_enabled` and `payouts_enabled` true.
3. Platform staff → charity **verification_status** = `verified`.

```bash
python manage.py wire_stripe_account acct_XXXX   # local seed only
```

---

## Verify / reject a charity (platform staff)

**API (staff user):**

- `GET /api/charities/pending/`
- `PATCH /api/charities/{id}/verify/`
- `PATCH /api/charities/{id}/reject/`

**Django admin:** edit `Charity.verification_status` and `is_active`.

Unverified charities cannot be selected for new published campaigns (API enforces publish gate).

---

## How much did a charity receive?

```bash
python manage.py charity_ledger_report --charity-slug SLUG --year 2025 --month 5
```

Source of truth: `LedgerEntry` with `entry_type=donation_received`, not `Donation.status` alone.

---

## Refunds

1. Issue refund in **Stripe Dashboard** (PaymentIntent / Charge).
2. Record state in app when refund webhook handling exists; until then, staff marks donation `refunded` in admin and adds manual `LedgerEntry` notes via finance process (no automated refund ledger in v2 yet).

---

## Receipt / email not sent

1. Donation `confirmed`?
2. `OutboxEvent` for `donation.confirmed` — status `done`?
3. Run `python manage.py drain_outbox` (one command per line; no `#` comments on the same line).
4. **Local dev:** without Gmail creds, `config.settings.dev` uses the **console** email backend. If `.env` forces SMTP with empty `EMAIL_HOST_USER`, remove `EMAIL_BACKEND=smtp` or set credentials.
5. **Prod:** Check SES / `EMAIL_BACKEND` in SSM.

---

## Incident: webhook signature failures

- Logs: `Invalid Stripe webhook signature`
- Prod: Dashboard endpoint signing secret must match SSM `/love/STRIPE_WEBHOOK_SECRET`
- Local: `whsec_` from **current** `stripe listen` session only

```bash
python manage.py check_stripe_webhook
```

---

## Phase 4 — trust & compliance

See [PHASE4.md](PHASE4.md).

- **Email verification:** prod `REQUIRE_EMAIL_VERIFICATION=True`; users verify via `/verify-email?token=…`
- **GDPR:** `gdpr_export_user` / `gdpr_erase_user USER --confirm` (staff only)
- **Webhook retention:** `purge_webhook_payloads` weekly
- **Stripe Radar:** Dashboard → Fraud & risk → Rules
- **Admin 2FA:** `ADMIN_REQUIRE_2FA=True` + staff enroll TOTP at `/admin/`

---

## Deploy checklist (short)

1. `terraform apply` / image push / ECS roll
2. `python manage.py migrate` (one-off task)
3. `python manage.py post_deploy_check`
4. Test webhook delivery + one `4242…` donation
5. Confirm `drain_outbox` schedule enabled
