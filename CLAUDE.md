# CLAUDE.md — working guide for the *Love That Gives Back* rebuild

> **One-liner:** a social platform for charitable giving built around life's
> celebrations — anyone creates a verified registry (wedding, birthday, memorial),
> guests donate to real charities, leave a public message, and discover causes.

This repo is being rebuilt from a single-couple wedding-donation **prototype (v0)**
into a multi-tenant **platform (v1)**. Authoritative companion specs:
- **[SCHEMA_DESIGN.md](SCHEMA_DESIGN.md)** — the data model (entities, fields, migration plan). Source of truth for the domain.
- **[DEPLOY.md](DEPLOY.md)** — AWS deployment (lean/budget-aware stack).

---

## Architecture

- **Backend:** Django 5 + Django REST Framework. **Modular monolith** — one
  deployable, internal module boundaries. PostgreSQL in prod, SQLite locally.
  gunicorn + WhiteNoise.
- **Frontend:** React 19 + Vite, React Router, axios, Bootstrap. Largely **ported
  from v0** — do not rewrite working components from scratch.
- **Payments:** Stripe (hosted Checkout + Connect). The platform never sees card
  or bank numbers.
- **Async:** an `OutboxEvent` table written in the same DB transaction as the
  donation, drained by a worker/Lambda (receipts, emails, webhook side-effects).
- **Hosting (AWS):** ECS Fargate (public subnet, **no NAT**) + RDS Postgres
  `t4g.micro` + S3/CloudFront (frontend) + SSM Parameter Store (secrets) + SES
  (email). See DEPLOY.md.

## Target repo structure

```
love/
  love_backend/
    config/                 # settings, urls, wsgi, asgi  (was love_backend/love_backend/)
    apps/
      core/                 # base models, tenant-scoping managers, AuditLog, OutboxEvent
      accounts/             # User extras, OrgMembership, auth views
      charities/            # Charity (tenant), PayoutAccount, verification
      campaigns/            # Campaign, CampaignBeneficiary
      donations/            # Donation, LedgerEntry, Receipt, Payout
      messaging/            # Message (guestbook) + moderation
      payments/             # Stripe Checkout/Connect, webhooks, reconciliation
    manage.py  Dockerfile  requirements.txt
  love_frontend/            # React/Vite (ported from v0)
  SCHEMA_DESIGN.md  DEPLOY.md  CLAUDE.md
```

## Core invariants — DO NOT VIOLATE

1. **Money can only ever reach a *verified* `Charity`.** No payouts to individuals.
2. **Never store raw bank or card data.** Payout identity = a Stripe account id +
   capability flags. (The v0 `bank_name`/`account_number`/`revolut_username`
   fields are deleted and must not return.)
3. **`LedgerEntry` is the source of truth for money** — append-only, reconciled
   daily against Stripe. Never mutate money state by editing a `Donation` directly.
4. **All public user content is moderatable and consent-gated** (`Message` has a
   `moderation_status`; public display requires explicit consent).
5. **Row-level multitenancy.** Every tenant-owned row carries an owner/charity FK;
   enforce isolation in DRF `get_queryset`, not only in serializers.
6. **No PII in public API responses** — donor email/contact never serialized to
   anonymous or non-owning users.
7. **PCI: stay SAQ-A.** Use Stripe-hosted Checkout/Elements; never POST card data
   through our backend.
8. **Idempotency** keys on all payment operations; **verify + dedupe** Stripe
   webhooks (by event id).

## Conventions

- **Secrets:** `os.environ` only; `.env` locally (gitignored), SSM in prod. Never
  commit secrets. `SECRET_KEY`/`DEBUG`/`ALLOWED_HOSTS` already env-driven.
- **DRF:** explicit `permission_classes` per view, default-deny on writes;
  serializers use explicit field allow-lists (no `fields = '__all__'`).
- **Migrations:** additive → backfill → tighten; each migration independently
  reversible. Never destructive in a single step on a live table.
- **Money:** `Decimal` only; store `currency` per row; convert to minor units only
  at the Stripe boundary.
- **Status values:** `Donation.status` is lowercase (`pending/confirmed/failed/
  refunded`). The historical CSV uses `"Confirmed"` — normalize on import.
- **Frontend:** API base from `VITE_API_URL`; shared axios instance with
  `withCredentials: true`.

## Dev commands

```bash
# backend
cd love_backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
# seed real history (idempotent; preserves dates; does NOT email guests):
python manage.py import_donations --csv ../love_frontend/public/data/donations.csv
# Phase 0 smoke (no Stripe network): pending → webhook → ledger → receipt
python manage.py smoke_donate_flow --drain

# frontend
cd love_frontend && npm ci && npm run dev      # build: npm run build ; test: npm test
```

## Security & privacy

- **GDPR:** data export + erasure, retention policy, explicit consent for public
  messages, donor email never public. Processor DPAs: Stripe, Cloudinary, SES.
- **Fraud:** verified-charity-only payouts is the structural defense; add Stripe
  Radar + new-account payout holds + velocity limits.
- **Audit:** `AuditLog` on every money / role / moderation action.

## What NOT to do

- ❌ Reintroduce bank/card fields on any model.
- ❌ Put PII in a public serializer or `fields = '__all__'`.
- ❌ Change money state without a `LedgerEntry`.
- ❌ Add a NAT Gateway, Aurora Serverless v2, or a second ALB (budget killers — see DEPLOY.md).
- ❌ Split into microservices — modular monolith until team/scale truly forces it.
- ❌ Rewrite working v0 React components from zero — port and adapt.

## Provenance

v0 prototype preserved at git branch `legacy-prototype` and in a local tarball
backup. The real wedding (27 donations, €3,780, real guest messages) is migrated
in as the **flagship campaign** and is the launch seed + DEV.to submission material.
