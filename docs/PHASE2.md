# Phase 2 — per-campaign UI & onboarding

**Prerequisite:** [Phase 0](PHASE0.md) local donate path; [Phase 1](PHASE1.md) for production deploy.

**Goal:** Multi-registry platform UX — public campaign pages, self-serve host & charity onboarding, remade home.

---

## Public site

| Route | Purpose |
|--------|---------|
| `/` | Platform landing (not wedding-only) |
| `/get-started` | Choose host vs charity path |
| `/register` | Standalone signup (`?next=` optional) |
| `/onboarding/couple` | Host registry wizard |
| `/onboarding/charity` | Charity registration + Stripe Connect |
| `/c/:slug` | Public campaign page |
| `/campaigns` | Directory of public campaigns |
| `/donate?campaign=<slug>` | Checkout for that campaign |

---

## Signed-in tools

| Route | Purpose |
|--------|---------|
| `/dashboard` | My registries + my charities (+ admin donations table) |
| `/dashboard/campaigns/:slug` | Edit registry + moderate guestbook |
| `/login` | Session login |

API: `POST /api/register/`, `POST /api/campaigns/`, `PATCH /api/campaigns/:slug/`, `GET /api/campaigns/mine/`, `POST /api/charities/`, `POST /api/payments/connect/`, guestbook `moderate` action.

---

## Manual check

```bash
cd love_frontend && npm run dev
# Terminal: love_backend runserver
```

1. `/` — landing with two onboarding cards
2. `/onboarding/couple` — register → create draft → pick verified charity → publish
3. `/c/<slug>` — public page; donate with correct `campaign` in checkout
4. `/onboarding/charity` — register charity → Stripe Connect link
5. `/dashboard` — lists campaigns and charity Connect status

---

## Still later (product polish)

- Cover image upload in wizard
- Co-host invites UI
- Platform admin verify queue in SPA (staff use Django admin today — see [RUNBOOK.md](RUNBOOK.md))
- Analytics filtered by campaign in UI

**Money ops:** [Phase 3](PHASE3.md) — reconciliation, scheduled outbox, monitoring.

---

## Done when

- [ ] New host can publish a registry end-to-end
- [ ] New charity can register and start Connect
- [ ] Home is platform-focused, not hardcoded to one couple
- [ ] Guestbook moderation works from dashboard manage page
