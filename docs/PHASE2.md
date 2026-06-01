# Phase 2 — per-campaign public UI

**Prerequisite:** [Phase 0](PHASE0.md) local donate path; [Phase 1](PHASE1.md) when deploying.

**Goal:** Multiple celebration registries on the public site, not only the flagship wedding homepage.

---

## Shipped in this slice

| Route | Purpose |
|--------|---------|
| `/` | Flagship campaign (first active public), unchanged wedding layout |
| `/c/:slug` | Public campaign page (title, story, donate, guestbook) |
| `/campaigns` | Directory of public campaigns (`GET /api/campaigns/`) |
| `/donate?campaign=<slug>` | Checkout scoped to that campaign |
| `/messages?campaign=<slug>` | Guestbook for that campaign |

API used: `GET /api/campaign/<slug>/`, `GET /api/messages/?campaign=`, `POST /api/payments/checkout/` with `campaign` slug.

**Flagship example:** `/c/anna-and-alan` (after seed import).

---

## Not in this slice (later)

- Host dashboard: create/edit campaign, `GET /api/campaigns/mine/`, guestbook moderation UI
- Analytics/stats filtered by campaign in the SPA
- Dynamic couple section / cover images per campaign (CampaignPage uses API text; Home still uses static BioShort/CoupleSection)
- Campaign-type-specific layouts (wedding vs birthday vs memorial)

---

## Manual check

```bash
cd love_frontend && npm run dev
```

1. http://localhost:5173/campaigns — list loads
2. http://localhost:5173/c/anna-and-alan — page + guestbook
3. Donate from that page — checkout payload includes `campaign: "anna-and-alan"`
4. http://localhost:5173/donate?campaign=anna-and-alan — same

---

## Done when

- [ ] `/campaigns` lists public campaigns
- [ ] `/c/<slug>` loads for seeded flagship
- [ ] Donate from campaign URL confirms correct `campaign` in Stripe metadata (after webhook/sync)
