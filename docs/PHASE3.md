# Phase 3 — money ops you can trust

**Prerequisites:** [Phase 0](PHASE0.md) (local donate + ledger), [Phase 1](PHASE1.md) (prod deploy), [Phase 2](PHASE2.md) (self-serve UI).

**Goal:** Operations match CLAUDE.md invariant #3 — the **ledger** is the source of truth, reconciled against Stripe, with reliable receipts and observable failures.

**Exit criterion:** You can answer “how much did charity X receive last month?” from the ledger without opening Stripe for every row, and prod runs `drain_outbox` on a schedule.

---

## Commands

| Command | Purpose |
|---------|---------|
| `python manage.py drain_outbox` | Receipts + thank-you emails (run every 5 min in prod) |
| `python manage.py reconcile_stripe` | Ledger ↔ donation ↔ Stripe PI checks |
| `python manage.py ops_health` | Failed webhooks, stuck outbox, stale pending donations |
| `python manage.py charity_ledger_report` | Per-charity totals from `LedgerEntry` |
| `python manage.py post_deploy_check` | Env + DB smoke after deploy |

### Examples

```bash
cd love_backend && . .venv/bin/activate

python manage.py drain_outbox
python manage.py ops_health
python manage.py reconcile_stripe --since-days 30
python manage.py charity_ledger_report --charity-slug marys-meals --year 2025 --month 4
python manage.py reconcile_stripe --no-stripe
```

**CLI tip:** Run each command on its own line. Inline `# comments` are passed to Django as extra arguments and cause `unrecognized arguments` errors.

**Local DB:** `reconcile_stripe` skips confirmed CSV-import rows (no `stripe_payment_intent_id`, no ledger) unless you pass `--include-legacy`. Flagship history is fine; new checkouts must have ledger rows.

`reconcile_stripe` exits **1** when issues are found (suitable for CI/cron).

---

## Production scheduling (Terraform)

With `enable_scheduled_tasks = true` (default), `infra/terraform` creates:

| Schedule | Task |
|----------|------|
| Every 5 minutes | `drain_outbox` |
| Daily 06:00 UTC | `reconcile_stripe --since-days 30` |
| Daily 06:00 UTC | `ops_health` |

Optional: set `alarm_sns_topic_arn` for a CloudWatch alarm on log pattern `Webhook handler failed`.

---

## Admin / support

- **Do not** use Django admin “Mark as Confirmed” for real money — it skips ledger + outbox. Webhooks are the path.
- Staff runbook: [RUNBOOK.md](RUNBOOK.md) (verify charity, stuck donations, refunds, Connect not ready).

---

## Done when

- [ ] `drain_outbox` scheduled in prod (EventBridge or manual cron documented)
- [ ] `reconcile_stripe` clean for last 30 days (or `--no-stripe` for legacy import-only)
- [ ] `ops_health` passes after a test donation
- [ ] `charity_ledger_report` matches expectations for flagship charities
- [ ] Admin team knows not to bulk-confirm donations without Stripe

---

## Next (Phase 4 — trust & compliance)

- GDPR export/erasure, webhook payload TTL
- Email verification before publish
- Stripe Radar / velocity limits
- Staff 2FA on Django admin

See original roadmap in project history; product polish (cover upload, co-host invites, verify queue SPA) can run in parallel when needed.
