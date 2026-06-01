# Phase 4 — trust, compliance & fraud

**Prerequisites:** [Phase 0](PHASE0.md)–[Phase 3](PHASE3.md).

**Goal:** Safer open registration — verified email before publish, GDPR tooling, payload retention, velocity limits, optional admin 2FA.

**Exit criterion:** Unverified hosts cannot publish or register charities; staff can export/erase a user; webhook payloads age out; checkout/register/login are rate-limited.

---

## Email verification

When `REQUIRE_EMAIL_VERIFICATION=True` (default in **prod**):

- Register must include **email**; a verification link is sent (`FRONTEND_URL/verify-email?token=…`).
- **Publish** campaign (`status=active`) and **register charity** are blocked until verified.
- Staff/superuser accounts bypass the gate.

**Local dev:** defaults to `False` — no verification required unless you set in `.env`:

```bash
REQUIRE_EMAIL_VERIFICATION=True
```

**API**

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/verify-email/` | Public | Body `{ "token": "…" }` |
| `POST /api/verify-email/resend/` | Session | Resend link |

`/api/me/` includes `email`, `email_verified`, `email_verification_required`.

---

## GDPR (staff commands)

```bash
python manage.py gdpr_export_user USERNAME > export.json
python manage.py gdpr_erase_user USERNAME --confirm
```

Erasure deactivates the account, drafts owned campaigns, anonymizes donations matching the user email. **Ledger rows are retained** for money audit.

---

## Webhook payload retention

```bash
python manage.py purge_webhook_payloads
python manage.py purge_webhook_payloads --days 90 --dry-run
```

Clears `WebhookEvent.payload` JSON older than `WEBHOOK_PAYLOAD_RETENTION_DAYS` (default 90). Schedule weekly in prod (EventBridge or cron).

---

## Fraud & velocity

| Control | Setting |
|---------|---------|
| Register throttle | 5/hour (`register` scope) |
| Checkout throttle | 30/hour |
| Login attempts | 30/hour per IP (cache) |
| Max donation | `MAX_CHECKOUT_AMOUNT` (default €10000) |

**Stripe Radar:** enable in Stripe Dashboard (rules, blocks). No code change required — document in [RUNBOOK.md](RUNBOOK.md).

---

## Admin 2FA (optional)

```bash
# .env / SSM
ADMIN_REQUIRE_2FA=True
```

Requires `django-otp`. After deploy, each staff user sets up TOTP at `/admin/`:

```bash
python manage.py migrate
# Per user: log in to admin → link authenticator app (TOTP)
```

---

## Manual check

```bash
cd love_backend && . .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate

# With verification on:
export REQUIRE_EMAIL_VERIFICATION=True
export DJANGO_SETTINGS_MODULE=config.settings.dev
python manage.py test donations.tests.Phase4TrustTests -v 2
```

1. Register with email → see verification message / banner on dashboard.
2. Try publish without verify → 400 with clear error.
3. Open `/verify-email?token=…` from console email → `email_verified` true on `/api/me/`.
4. `purge_webhook_payloads --dry-run` runs without error.

---

## Done when

- [ ] Prod: `REQUIRE_EMAIL_VERIFICATION=True` in SSM
- [ ] Verification emails deliver (SES)
- [ ] `purge_webhook_payloads` scheduled
- [ ] Staff know `gdpr_export_user` / `gdpr_erase_user`
- [ ] Stripe Radar enabled in Dashboard
- [ ] (Optional) `ADMIN_REQUIRE_2FA=True` and staff enrolled

---

## Next

Product polish from [Phase 2](PHASE2.md): cover upload, co-host invites, verify queue SPA, per-campaign analytics.
