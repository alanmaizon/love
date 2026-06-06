---
title: "Love That Gives Back: turning a wedding gift list into a charity-giving platform"
published: false
description: "We started with a single wedding's donation page — 27 gifts, €3,780, real guest messages — and rebuilt it into a multi-tenant platform where every euro flows through Stripe to a verified charity, on an append-only ledger."
tags: django, react, stripe, aws
cover_image: ./assets/submission-cover.png
canonical_url: 
---

> **TL;DR** — A real wedding asked guests for charity donations instead of gifts. That single-couple prototype became *Love That Gives Back*: a multi-tenant platform where anyone can spin up a registry for any celebration, guests donate to **verified** charities through Stripe, leave a moderated public message, and every euro is tracked on an append-only ledger. The original wedding (27 gifts, **€3,780**, 27 guest messages) is the live flagship campaign.

## Where it started

A year ago, instead of a traditional gift list, a couple — Anna & Alan — asked their wedding guests to donate to three charities that mattered to them: **Mary's Meals**, **Operation Smile**, and **Xingu Vivo** (a grassroots Amazon-basin movement). Each choice had a story: a visit to the Scottish Highlands where Mary's Meals began; a brother born with a cleft palate; a wedding ring "paid for" with a donation instead of cash.

The v0 site did the job, but it was held together with tape:

- Guests transferred money manually over Revolut/bank, and an admin clicked **"confirm"** by hand.
- **Bank details were stored in plaintext** on a model.
- The guestbook was a static CSV.
- Charts were server-rendered matplotlib PNGs dragging in ~8 heavy dependencies.

It worked for *one* couple. The interesting question was: what if **anyone** could do this — for a birthday, a memorial, any celebration — without the manual money handling and without a platform ever touching a bank number?

## What I built

A **modular monolith** that treats money with the seriousness it deserves.

| | v0 prototype | v2 platform |
|---|---|---|
| Tenancy | one hardcoded couple | many **Campaigns** + **Charities**, row-scoped |
| Money | manual transfer, admin clicks "confirm" | **Stripe Connect** destination charges → verified charity |
| Bank data | plaintext `account_number` on a model | **never stored** — a Stripe account id + capability flags |
| Split | 50% couple / 50% charity | **100% to charity** |
| Source of truth | the `Donation` row | append-only **`LedgerEntry`**, reconcilable |
| Guestbook | static CSV, unmoderated | moderated `Message` API (approved-only public) |
| Webhooks | — | signature-verified, **idempotent** (deduped by event id) |
| PII | donor email in public responses | stripped for non-staff; JSON-only API |

**Stack:** Django 5 + DRF (Postgres in prod, SQLite locally), React 19 + Vite on the front, Stripe-hosted Checkout + Connect for payments, all deployable to a deliberately lean AWS footprint.

## The invariants I refused to break

Money software is mostly about what you *won't* let happen. I wrote these down on day one and built guardrails around them:

1. Money can only ever reach a **verified** `Charity`. No payouts to individuals.
2. **Never** store raw bank/card data — payout identity is a Stripe account id, full stop.
3. `LedgerEntry` is the source of truth for money — **append-only**, reconciled daily against Stripe. You never mutate money state by editing a `Donation`.
4. All public user content is **moderatable** and consent-gated.
5. Row-level multitenancy enforced in DRF `get_queryset`, not just in serializers.
6. No PII (donor email) in public API responses.
7. PCI: stay **SAQ-A** — Stripe-hosted Checkout only; card data never touches the backend.
8. **Idempotency** on every payment op; verify *and* dedupe webhooks by event id.

The one that shaped the most code is #3. A donation isn't "real" because a row says `confirmed` — it's real because a signed Stripe webhook arrived, was deduped, and wrote a ledger entry inside the same transaction as an `OutboxEvent`:

```python
# same DB transaction: ledger + outbox, drained later for receipts/emails
with transaction.atomic():
    LedgerEntry.objects.create(donation=donation, amount=amount, ...)
    OutboxEvent.objects.create(kind="donation.confirmed", payload={...})
```

A worker (`manage.py drain_outbox`) drains the outbox to send receipts and thank-you emails. If email delivery is down, the money record is still correct and the side effects retry — no lost receipts, no double charges.

## The hardest lesson: don't test someone else's UI

My end-to-end test originally drove **Stripe's hosted Checkout page** in CI with Playwright — typing the `4242…` test card into Stripe's iframes. It was chronically flaky, and eventually I understood *why*: Stripe flags headless/datacenter traffic with an agent-identity challenge and never completes the charge. Automating that page in CI tests **Stripe**, not my app — and it's PCI SAQ-A territory I don't own.

So I decoupled it:

- **CI test** fills my donate form, asserts the backend created a valid `checkout.stripe.com` session (proving params + idempotency), then confirms the donation through the **real webhook code path** via a `DEBUG`-and-`E2E_TEST_HOOKS`-gated endpoint, and finishes the browser flow: pending guestbook → host approves → public.
- **Live UI walk** (the full card entry) stays a local-only `@live` test.

CI went from a multi-minute flake-fest to a deterministic ~4s run. The principle generalizes: **at your trust boundary, assert the contract you control, not the third party's UI.**

## Shipping it without lighting money on fire

The deploy target is intentionally cheap. Using the AWS pricing tooling against my Terraform, the whole stack lands around **$50–60/month**:

- ECS Fargate (0.25 vCPU / 0.5 GB) **in public subnets — no NAT Gateway** (that alone saves ~$32/mo)
- RDS `db.t4g.micro` PostgreSQL, Single-AZ ($0.017/hr)
- One ALB, S3 + CloudFront for the SPA, SSM Parameter Store for secrets

The budget guardrails are explicit non-goals in the repo: no NAT, no Aurora Serverless v2, no second ALB. I wrapped the whole go-live into one idempotent script (`scripts/phase1-golive.sh`) with subcommands — `infra`, `acm`, `ssm`, `image`, `migrate`, `frontend`, `webhook`, `verify` — that read straight from Terraform outputs.

## What it looks like

With the flagship seeded, the "real money plumbing" is visible end to end:

- **Home** — hero + a guestbook carousel of 27 *real* guest messages.
- **Analytics** — €3,780 raised, 27 gifts, per-charity bars, goal progress.
- **Admin** — Donations, **read-only Ledger entries**, Webhook events. (These two tables are the whole thesis in one screen.)

<!-- TODO: add screenshots — home guestbook carousel, analytics €3,780, admin ledger + webhook events tables. -->

## What I'd do next

- Self-serve **cover image upload** and **co-host invites** in the registry wizard.
- Move the platform-admin **charity verification queue** out of Django admin and into the SPA.
- Per-campaign analytics for hosts.

## Try it / read it

- **Repo:** https://github.com/alanmaizon/love
- **Live demo:** <!-- TODO: deployed URL -->

If you take one thing from this: when you build on top of a payment processor, let *their* hosted surface own the card data and the compliance — and make your own system provably correct with an append-only ledger, idempotent webhooks, and a transactional outbox. The wedding was the excuse; the ledger is the point.
