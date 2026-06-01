# Deploying love (Django API + React/Vite) to AWS

Lean, budget-aware stack for a solo dev with limited credits.

```
 CloudFront + S3  ─────────────►  React/Vite static site        ~$1–2/mo
 ALB (HTTP→HTTPS) ─► ECS Fargate (Django, public subnet, NO NAT) ~$15–30/mo
                         └─ Security group ─► RDS Postgres (private, t4g.micro) ~$13/mo
 SSM Parameter Store (secrets, FREE)   SES (email)   CloudWatch (logs)
```
**~$30–50/mo → ~$200 lasts ~4–5 months.** After credits, ~$35–45/mo.

> **Why Fargate+ALB and not App Runner?** App Runner needs a VPC connector to
> reach a private RDS, which forces **all** egress through a NAT Gateway (~$32/mo).
> Fargate tasks in a **public subnet** reach the internet via the (free) Internet
> Gateway *and* reach private RDS in-VPC — no NAT. If you'd rather trade "real AWS"
> for half the cost and zero VPC fiddling, use **Lightsail Containers + Lightsail
> Postgres (~$25/mo flat)** instead; the Dockerfile here works there too.

---

## ⚠️ Step 0 — Budget guardrail (do this FIRST, before any resource)
One left-on NAT Gateway or Aurora instance can silently burn your whole credit
balance. Set alerts immediately:

```bash
# Email alert at 50% / 80% / 100% of a $150 monthly budget.
cat > /tmp/budget.json <<'JSON'
{ "BudgetName": "love-monthly", "BudgetLimit": {"Amount":"150","Unit":"USD"},
  "TimeUnit": "MONTHLY", "BudgetType": "COST" }
JSON
cat > /tmp/notify.json <<'JSON'
[ { "Notification": {"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},
    "Subscribers": [{"SubscriptionType":"EMAIL","Address":"maizonalan@gmail.com"}] } ]
JSON
aws budgets create-budget --account-id "$(aws sts get-caller-identity --query Account --output text)" \
  --budget file:///tmp/budget.json --notifications-with-subscribers file:///tmp/notify.json
```
Also enable **Billing > Billing preferences > "Receive Free Tier / billing alerts."**

**Never enable, unless you truly need them:** NAT Gateway (~$32), a second ALB
(~$18 each), Aurora Serverless v2 (~$43 idle). These are the budget killers.

---

## Prerequisites
```bash
brew install awscli docker terraform   # docker via Docker Desktop
aws configure                          # set region e.g. eu-west-1 (Ireland) or us-east-1
```

## Step 1 — Secrets into SSM Parameter Store (free; not Secrets Manager)
```bash
REGION=eu-west-1
put() { aws ssm put-parameter --region $REGION --name "/love/$1" --type "$2" --value "$3" --overwrite; }

put SECRET_KEY           SecureString "$(python3 -c 'import secrets;print(secrets.token_urlsafe(64))')"
put DEBUG                String       "False"
put ALLOWED_HOSTS        String       '["api.yourdomain.com","<alb-dns-name>"]'
put CORS_ALLOWED_ORIGINS String       '["https://yourdomain.com"]'
put CSRF_TRUSTED_ORIGINS String       '["https://yourdomain.com"]'
put DATABASE_URL         SecureString "postgres://loveadmin:CHANGEME@<rds-endpoint>:5432/love"
put GOOGLE_APP_PASS      SecureString "<gmail app password>"
put AWS_STORAGE_BUCKET_NAME String    "love-media-yourname"   # S3 bucket for uploads
put AWS_S3_REGION_NAME      String    "$REGION"
put STRIPE_SECRET_KEY        SecureString "sk_test_..."       # or sk_live_ when ready
put STRIPE_PUBLISHABLE_KEY   SecureString "pk_test_..."
put STRIPE_WEBHOOK_SECRET    SecureString "whsec_..."          # Dashboard webhook signing secret
put FRONTEND_URL             String       "https://yourdomain.com"
put PLATFORM_FEE_BPS         String       "0"
put STRIPE_CURRENCY          String       "eur"
# COOKIE_DOMAIN: leave unset, or set to ".yourdomain.com" if API+web share it.
# Media uploads go to S3 via django-storages; boto3 uses the ECS task role for
# auth (grant it s3:PutObject/GetObject on the media bucket) — no keys in env.
```
The ECS task definition references these by ARN as `secrets` (so values never sit
in image layers or Terraform state).

## Step 2 — ECR repo + build & push the image
```bash
aws ecr create-repository --repository-name love-api --region $REGION
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGISTRY=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REGISTRY

docker build -t $REGISTRY/love-api:latest love_backend/
docker push $REGISTRY/love-api:latest
```

## Step 3 — Compute + DB + ALB (the infra layer)
This is the VPC / RDS / ECS / ALB layer. It will be codified as Terraform in
`infra/` (next deliverable) so it is reproducible and tear-down-able in one
command — important for protecting credits. Until then, the AWS Console
**ECS > "Create cluster" (Fargate)** wizard + **RDS > Create (PostgreSQL,
db.t4g.micro, NOT publicly accessible)** will stand it up. Key settings:
- Tasks: **public subnets, "Assign public IP: ENABLED", no NAT.**
- Task security group: inbound only from the ALB security group.
- RDS security group: inbound 5432 only from the task security group.
- Task role: allow `ssm:GetParameters` for `/love/*` + `kms:Decrypt`.
- ALB: HTTP:80 → target group :8000 (add HTTPS:443 in Step 5).

## Step 4 — Frontend to S3 + CloudFront
```bash
cd love_frontend
echo 'VITE_API_URL=https://api.yourdomain.com' > .env.production
npm ci && npm run build           # outputs dist/
aws s3 mb s3://love-web-yourname --region $REGION
aws s3 sync dist/ s3://love-web-yourname --delete
# Create a CloudFront distribution with this bucket as origin (OAC, default
# root object index.html, SPA 404->/index.html). Then invalidate on each deploy:
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

## Step 5 — HTTPS + custom domain (required before real logins)
Secure cookies need TLS. Request an **ACM certificate** for `yourdomain.com` +
`api.yourdomain.com` (DNS-validate in Route 53), attach to the ALB (HTTPS:443
listener, redirect 80→443) and CloudFront. Point DNS:
`yourdomain.com` → CloudFront, `api.yourdomain.com` → ALB.

## Step 6 — Import historical data + post-deploy checks
```bash
# One-off ECS task (or `aws ecs run-task`) running:
python manage.py migrate
python manage.py import_donations --csv love_frontend/public/data/donations.csv
python manage.py createsuperuser
```
Verify: `https://api.yourdomain.com/api/analytics/` returns total_amount = 3780,
admin loads, a test donation flows end to end.

**Stripe webhook (required for confirmed donations):** Dashboard → Webhooks →
`https://api.yourdomain.com/api/payments/webhook/` with events
`checkout.session.completed`, `payment_intent.succeeded`, `account.updated`.
See [docs/PHASE1.md](docs/PHASE1.md).

---

### CI/CD
[.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds + pushes to
ECR and rolls the ECS service on push to `main`. Set repo Variables:
`AWS_REGION, ECR_REPOSITORY, ECS_CLUSTER, ECS_SERVICE, AWS_ROLE_ARN` (OIDC role).

### Tear down (stop all charges)
With Terraform: `terraform destroy`. By hand: delete CloudFront, S3, ALB, ECS
service+cluster, RDS (skip final snapshot if you don't need it), NAT (if any),
and the VPC — in that order.
