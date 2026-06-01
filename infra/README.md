# Phase 1 infrastructure (Terraform)

Reproducible AWS stack for [docs/PHASE1.md](../docs/PHASE1.md):

- VPC (public subnets for ALB/ECS, private for RDS, **no NAT**)
- RDS PostgreSQL 16 (`db.t4g.micro`)
- ECR + ECS Fargate + ALB
- S3 + CloudFront (SPA frontend)
- S3 media bucket + IAM for task role
- SSM parameters under `/love/*`

## Prerequisites

- AWS CLI configured (`aws configure`)
- Terraform >= 1.5
- Docker (build/push API image)
- `TF_VAR_db_password` or `terraform.tfvars` (never commit real passwords)

## 1. Apply infrastructure

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set db_password

terraform init
terraform plan
terraform apply
```

Save outputs:

```bash
terraform output -json github_deploy_vars
terraform output alb_dns_name
terraform output cloudfront_domain
terraform output cloudfront_distribution_id
```

## 2. Fill SSM secrets (Stripe, CORS, etc.)

`DATABASE_URL` and `ALLOWED_HOSTS` (ALB DNS) are set by Terraform. Overwrite the rest:

```bash
cd ../..
export AWS_REGION=eu-west-1
export API_URL="$(cd infra/terraform && terraform output -raw api_base_url)"
export FRONTEND_URL="$(cd infra/terraform && terraform output -raw cloudfront_domain)"
./scripts/phase1-ssm.sh
```

Then edit Stripe keys and `STRIPE_WEBHOOK_SECRET` (from Dashboard webhook — see PHASE1 §3).

## 3. Build & push API image

```bash
REGION=eu-west-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGISTRY=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com
REPO=$(cd infra/terraform && terraform output -raw ecr_repository_url | cut -d/ -f2-)

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REGISTRY
docker build -t $REGISTRY/$REPO:latest love_backend/
docker push $REGISTRY/$REPO:latest

aws ecs update-service --cluster love-cluster --service love-api --force-new-deployment
```

Or push to `main` after configuring GitHub Actions variables from `terraform output github_deploy_vars`.

## 4. Deploy frontend

```bash
export VITE_API_URL="$API_URL"   # or https://api.yourdomain.com after ACM
./scripts/phase1-deploy-frontend.sh
```

## 5. One-off ECS task (migrate / seed / superuser)

```bash
# Use AWS Console → ECS → Run task with the same task definition, override command:
# python manage.py migrate --noinput
# python manage.py post_deploy_check
# python manage.py import_donations --csv ...
```

## 6. Stripe webhook (required)

Dashboard → Webhooks → `https://api.YOUR_DOMAIN/api/payments/webhook/`  
Events: `checkout.session.completed`, `payment_intent.succeeded`, `account.updated`  
Put signing secret in SSM `/love/STRIPE_WEBHOOK_SECRET`, restart ECS.

## Tear down

```bash
cd infra/terraform && terraform destroy
```

Deletes billable resources (RDS snapshot skipped by default).
