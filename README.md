# Love That Gives Back 💛

> A social platform for charitable giving built around life's celebrations.
> Anyone creates a verified registry (wedding, birthday, memorial); guests
> donate to **real, verified charities**, leave a public message, and discover
> causes worth supporting.

This repo was rebuilt from a single-couple **wedding-donation prototype (v0)**
into a multi-tenant **giving platform (v2)** — every euro now flows through
Stripe to a *verified* charity, with an append-only ledger, content moderation,
and row-level multitenancy. The real wedding it started as (27 gifts, **€3,780**,
27 guest messages) is migrated in as the **flagship campaign**.

📐 [SCHEMA_DESIGN.md](SCHEMA_DESIGN.md) · 🚀 [DEPLOY.md](DEPLOY.md) · 🤝 [CLAUDE.md](CLAUDE.md)

---

## What changed v0 → v2

| | v0 prototype | v2 platform |
|---|---|---|
| Tenancy | one hardcoded couple (`Profile`) | many **Campaigns** + **Charities**, row-scoped |
| Money | manual Revolut/bank transfer, admin clicks "confirm" | **Stripe Connect** destination charges → verified charity |
| Bank data | plaintext `bank_name`/`account_number` on a model | **never stored** — Stripe account id + capability flags only |
| Split | 50% couple / 50% charity | **100% to charity** |
| Source of truth | the `Donation` row | append-only **`LedgerEntry`**, reconcilable |
| Guestbook | static CSV, unmoderated | moderated **`Message`** API (approved-only public) |
| Charts | server-side matplotlib PNG (~8 heavy deps) | JSON `/api/stats/` + client-side rendering |
| Webhooks | — | signature-verified, **idempotent** (deduped by event id) |
| PII | donor email + bank in public responses | stripped for non-staff; JSON-only API |

## Architecture

- **Backend** — Django 5 + DRF, modular monolith: `config/` + `apps/{core,
  accounts,campaigns,donations,messaging,payments}`. Postgres in prod, SQLite
  locally. gunicorn + WhiteNoise.
- **Frontend** — React 19 + Vite, React Router, axios, Bootstrap (ported from v0).
- **Payments** — Stripe-hosted Checkout + Connect (PCI **SAQ-A**; card data never
  touches our backend).
- **Reliable async** — an `OutboxEvent` row written in the same transaction as
  the donation, drained by `manage.py drain_outbox` (receipts, emails).

## Run it locally

**Backend** (from `love_backend/`):
```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py import_donations --csv ../love_frontend/public/data/donations.csv  # seed flagship
python manage.py createsuperuser           # for /admin
python manage.py runserver                 # http://localhost:8000
```

**Frontend** (from `love_frontend/`):
```bash
cp .env.example .env.local                 # VITE_API_URL=http://localhost:8000
npm ci
npm run dev                                # http://localhost:5173
```

**Payments (test mode, optional)** — put Stripe **test** keys in `love_backend/.env`
(see `.env.example`), then forward webhooks:
```bash
stripe listen --forward-to localhost:8000/api/payments/webhook/
```
The `whsec_…` it prints is your `STRIPE_WEBHOOK_SECRET`. A test donation then
flows: Checkout → webhook → `LedgerEntry` + `Receipt` (via the outbox).

## Tests
```bash
# backend — 34 tests: authz boundary, no-PII contract, idempotent webhook, ledger
cd love_backend && DJANGO_SETTINGS_MODULE=config.settings.dev python manage.py test donations payments

# frontend — vitest (see note below)
cd love_frontend && npm test
```
> **Frontend test note:** the backend suite is the source of truth for v2
> behavior. Several React unit suites were inherited from v0 and assert old UI /
> mock `axios` in a way that predates the shared axios instance; they need a
> refresh. `DonationConfirmation` is updated for the Stripe flow; the others are
> tracked as a known cleanup.

## Core invariants (do not violate)
1. Money can only ever reach a **verified** `Charity`.
2. **Never** store raw bank/card data — payout identity = a Stripe account id.
3. `LedgerEntry` is the source of truth for money — append-only, reconciled.
4. All public user content is **moderatable**; public display is consent-gated.
5. Row-level multitenancy enforced in DRF `get_queryset`, not just serializers.
6. No PII (donor email) in public API responses.
7. PCI: stay **SAQ-A** — Stripe-hosted Checkout only.
8. **Idempotency** on payment ops; verify + dedupe webhooks by event id.

## 📸 Screenshots for the write-up

With both servers running and the flagship seeded, these are the money shots:

| Page | URL | Shows |
|---|---|---|
| **Home** | `localhost:5173/` | hero, countdown, **guestbook carousel** (27 real messages) |
| **Analytics** | `localhost:5173/analytics` | **€3,780 raised**, 27 gifts, per-charity bars, goal progress |
| **Charities** | `localhost:5173/charities` | Mary's Meals · Operation Smile · Xingu Vivo (verified) |
| **Donate** | `localhost:5173/donate` | the gift form → redirects to Stripe Checkout |
| **Admin** | `localhost:8000/admin` | Donations, **Ledger entries** (read-only), Campaigns, Webhook events |

Tip for the post: the admin **Ledger entries** and **Webhook events** tables make
the "real money plumbing" point visually; the analytics page proves the €3,780.
