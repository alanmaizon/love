# Phase 1 — first deploy (staging or production)

**Prerequisite:** [Phase 0](PHASE0.md) complete locally.

**Exit criterion:** Public HTTPS donate flow with Stripe **Dashboard webhooks** → donation `confirmed` + ledger (no `sync-checkout`).

---

## One-command go-live (recommended)

[`scripts/phase1-golive.sh`](../scripts/phase1-golive.sh) wires the steps below into
idempotent, re-runnable subcommands. It reads everything from Terraform outputs and
reuses `phase1-ssm.sh` / `phase1-deploy-frontend.sh`.

```bash
cd love
export AWS_REGION=eu-west-1
export TF_VAR_db_password='…'            # or create infra/terraform/terraform.tfvars

./scripts/phase1-golive.sh all                    # infra → ssm → image → migrate → frontend → verify
./scripts/phase1-golive.sh acm api.YOURDOMAIN.com # HTTPS: prints DNS CNAME, waits, re-applies
./scripts/phase1-golive.sh frontend               # rebuild SPA against the https:// API
./scripts/phase1-golive.sh webhook whsec_…        # after adding the Stripe Dashboard endpoint
```

`acm` and `webhook` are separate because each needs one manual action (add the DNS
record / create the Stripe endpoint); the script automates everything around them.
Run `./scripts/phase1-golive.sh help` for the full subcommand list. The manual,
per-step path below is equivalent and useful for debugging.

---

## Quick path (Terraform)

Full detail: [infra/README.md](../infra/README.md)

```bash
# 1) Infrastructure
cd infra/terraform && cp terraform.tfvars.example terraform.tfvars
# set db_password in terraform.tfvars
terraform init && terraform apply

# 2) Secrets (Stripe, CORS, keys)
export AWS_REGION=eu-west-1
export API_URL="$(terraform output -raw api_base_url)"
export FRONTEND_URL="$(terraform output -raw cloudfront_domain)"
../../scripts/phase1-ssm.sh
# then set STRIPE_* and STRIPE_WEBHOOK_SECRET in SSM (Dashboard webhook)

# 3) API image
docker build -t $(terraform output -raw ecr_repository_url):latest ../../love_backend/
docker push $(terraform output -raw ecr_repository_url):latest
aws ecs update-service --cluster love-cluster --service love-api --force-new-deployment

# 4) Frontend
export VITE_API_URL="$API_URL"
../../scripts/phase1-deploy-frontend.sh

# 5) Migrate (one-off ECS task or local with DATABASE_URL)
python manage.py migrate
python manage.py post_deploy_check
```

**HTTPS note:** CloudFront serves the SPA over HTTPS. Browsers block calls from HTTPS pages to an HTTP API. After `terraform apply`, either:

1. Request an ACM cert in **eu-west-1** (DNS validate), set `api_acm_certificate_arn` in `terraform.tfvars`, and `terraform apply` again, then use `terraform output -raw api_base_url` (will be `https://…`), or  
2. Smoke-test the API with `curl` against the ALB URL before deploying the frontend.

Stripe Dashboard webhooks also need a **public HTTPS** URL (e.g. `https://api.yourdomain.com/api/payments/webhook/`).

---

## GitHub Actions (ongoing deploys)

After `terraform apply`, set repository **Variables**:

| Variable | From `terraform output github_deploy_vars` |
|----------|---------------------------------------------|
| `AWS_REGION` | region |
| `ECR_REPOSITORY` | e.g. `love-api` |
| `ECS_CLUSTER` | `love-cluster` |
| `ECS_SERVICE` | `love-api` |
| `AWS_ROLE_ARN` | IAM OIDC role (create per DEPLOY.md) |
| `FRONTEND_BUCKET` | web bucket name |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront id |
| `VITE_API_URL` | `https://api.yourdomain.com` or ALB URL |

Workflows: `.github/workflows/deploy.yml` (API), `deploy-frontend.yml` (SPA).

---

## Stripe webhooks (required)

Endpoint:

```text
https://api.YOUR_DOMAIN/api/payments/webhook/
```

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. Events: `checkout.session.completed`, `payment_intent.succeeded`, `account.updated`
3. Copy **signing secret** → SSM `/love/STRIPE_WEBHOOK_SECRET`
4. Restart ECS / redeploy
5. Test delivery → **200**; test donate with `4242…`

**Do not** use `stripe listen` whsec in production.

---

## Post-deploy checks

```bash
python manage.py post_deploy_check
python manage.py shell -c "
from payments.models import WebhookEvent
from donations.models import Donation
print('webhooks', WebhookEvent.objects.count())
print(list(Donation.objects.order_by('-id').values('id','status')[:5]))
"
```

- [ ] `https://YOUR_CLOUDFRONT/` — site loads
- [ ] `https://api.../health/` → `{"status":"ok"}`
- [ ] Admin `/admin/` over HTTPS
- [ ] Test checkout → webhook 200 → `confirmed`

---

## Manual / Console path

Without Terraform: follow [DEPLOY.md](../DEPLOY.md) (Console ECS + RDS + S3).

---

## Done when

- [ ] Terraform applied (or manual infra equivalent)
- [ ] SSM secrets + Stripe webhook configured
- [ ] API + frontend deployed
- [ ] `post_deploy_check` passes on ECS
- [ ] Live test donation confirms via webhook

---

## Next

- [Phase 2](PHASE2.md) — onboarding & multi-campaign UI (shipped in app)
- [Phase 3](PHASE3.md) — reconciliation, `drain_outbox` schedule, ops runbook
- ACM custom domain on ALB + CloudFront (DEPLOY Step 5)
