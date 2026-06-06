#!/usr/bin/env bash
# Phase 1 go-live orchestrator — wires together the individual steps from
# docs/PHASE1.md and infra/README.md into idempotent, re-runnable subcommands.
#
# Usage:
#   ./scripts/phase1-golive.sh <command> [args]
#
# Commands:
#   infra              terraform init + apply (needs TF_VAR_db_password or terraform.tfvars)
#   acm <domain>       request/validate an ACM cert in $AWS_REGION, wire it into the ALB, re-apply
#   ssm                write /love/* params (SECRET_KEY, CORS, etc.) + remind about Stripe keys
#   image              docker build + push API image to ECR, force a new ECS deployment
#   migrate            one-off Fargate task: manage.py migrate --noinput, then post_deploy_check
#   frontend           build the SPA and sync to S3 + invalidate CloudFront
#   webhook <whsec>    store STRIPE_WEBHOOK_SECRET in SSM and roll the service
#   verify             curl the API /health/ endpoint
#   all                infra → ssm → image → migrate → frontend → verify
#                      (acm + webhook are interactive and run separately)
#
# Everything is idempotent: re-running a command converges to the same state.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGION="${AWS_REGION:-eu-west-1}"
CLUSTER="${ECS_CLUSTER:-love-cluster}"
SERVICE="${ECS_SERVICE:-love-api}"
TASK_FAMILY="${ECS_TASK_FAMILY:-love-api}"
TF_DIR="$ROOT/infra/terraform"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
die()  { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

tf() { terraform -chdir="$TF_DIR" "$@"; }

tf_output() { tf output -raw "$1" 2>/dev/null || true; }

require_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

require_stack() {
  [[ -n "$(tf_output ecr_repository_url)" ]] || die "Terraform state empty — run '$0 infra' first."
}

cmd_infra() {
  require_cmd terraform
  bold "[infra] terraform init + apply (region=$REGION)"
  if [[ ! -f "$TF_DIR/terraform.tfvars" && -z "${TF_VAR_db_password:-}" ]]; then
    die "Set TF_VAR_db_password or create infra/terraform/terraform.tfvars (db_password) first."
  fi
  tf init -input=false
  tf apply -auto-approve
  info "api_base_url:    $(tf_output api_base_url)"
  info "cloudfront:      $(tf_output cloudfront_domain)"
  info "alb_dns_name:    $(tf_output alb_dns_name)"
}

cmd_acm() {
  require_cmd aws
  local domain="${1:-${API_DOMAIN:-}}"
  [[ -n "$domain" ]] || die "Usage: $0 acm <api.YOURDOMAIN.com>"
  bold "[acm] certificate for $domain in $REGION"

  local arn
  arn="$(aws acm list-certificates --region "$REGION" \
    --query "CertificateSummaryList[?DomainName=='$domain'].CertificateArn | [0]" \
    --output text 2>/dev/null || true)"
  if [[ -z "$arn" || "$arn" == "None" ]]; then
    arn="$(aws acm request-certificate --region "$REGION" \
      --domain-name "$domain" --validation-method DNS \
      --query CertificateArn --output text)"
    info "requested new cert: $arn"
  else
    info "reusing existing cert: $arn"
  fi

  bold "[acm] DNS validation record (add this CNAME to your DNS):"
  aws acm describe-certificate --region "$REGION" --certificate-arn "$arn" \
    --query "Certificate.DomainValidationOptions[0].ResourceRecord" --output table || true
  info "Also point: $domain  CNAME  $(tf_output alb_dns_name)"

  bold "[acm] waiting for certificate to be ISSUED (Ctrl-C to bail; re-run is safe)"
  aws acm wait certificate-validated --region "$REGION" --certificate-arn "$arn"

  # Wire the cert into the ALB via tfvars, then re-apply so api_base_url -> https.
  local tfvars="$TF_DIR/terraform.tfvars"
  if grep -q '^api_acm_certificate_arn' "$tfvars" 2>/dev/null; then
    sed -i.bak "s|^api_acm_certificate_arn.*|api_acm_certificate_arn = \"$arn\"|" "$tfvars" && rm -f "$tfvars.bak"
  else
    echo "api_acm_certificate_arn = \"$arn\"" >> "$tfvars"
  fi
  tf apply -auto-approve
  info "api_base_url is now: $(tf_output api_base_url)"
}

cmd_ssm() {
  require_cmd aws
  require_stack
  bold "[ssm] writing /love/* parameters"
  local frontend_url
  frontend_url="$(tf_output frontend_url)"
  [[ -n "$frontend_url" ]] || frontend_url="$(tf_output cloudfront_domain)"
  AWS_REGION="$REGION" \
    API_URL="$(tf_output api_base_url)" \
    FRONTEND_URL="$frontend_url" \
    MEDIA_BUCKET="$(tf_output media_bucket)" \
    "$ROOT/scripts/phase1-ssm.sh"

  for p in STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY; do
    if ! aws ssm get-parameter --region "$REGION" --name "/love/$p" >/dev/null 2>&1; then
      bold "[ssm] /love/$p not set — add it:"
      info "aws ssm put-parameter --region $REGION --name /love/$p --type SecureString --value <key> --overwrite"
    fi
  done
}

cmd_image() {
  require_cmd aws; require_cmd docker
  require_stack
  bold "[image] build + push API image, roll service"
  local account registry repo
  account="$(aws sts get-caller-identity --query Account --output text)"
  registry="$account.dkr.ecr.$REGION.amazonaws.com"
  repo="$(tf_output ecr_repository_url | cut -d/ -f2-)"
  aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$registry"
  # Fargate runs linux/amd64 by default; force the platform so the image runs even
  # when built on Apple Silicon. --provenance=false keeps a single-arch manifest
  # that ECR/Fargate accept (buildx attestations otherwise produce a manifest list).
  docker buildx build --platform linux/amd64 --provenance=false \
    -t "$registry/$repo:latest" --push "$ROOT/love_backend/"
  aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --force-new-deployment --region "$REGION" >/dev/null
  info "waiting for service to stabilize…"
  aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE" --region "$REGION"
  info "service stable"
}

# Run an arbitrary management command as a one-off Fargate task and wait for it.
run_task() {
  local desc="$1"; shift
  local subnets ecs_sg overrides
  subnets="$(aws ec2 describe-subnets --region "$REGION" \
    --filters "Name=tag:Name,Values=${TASK_FAMILY%-api}-public-*" \
    --query 'Subnets[].SubnetId' --output text | tr '\t' ',')"
  [[ -n "$subnets" ]] || die "could not resolve public subnets by tag"
  ecs_sg="$(aws ec2 describe-security-groups --region "$REGION" \
    --filters "Name=tag:Name,Values=${TASK_FAMILY%-api}-ecs-sg" \
    --query 'SecurityGroups[0].GroupId' --output text)"
  [[ -n "$ecs_sg" && "$ecs_sg" != "None" ]] || die "could not resolve ECS security group by tag"

  # Build a JSON command array from the remaining args.
  local cmd_json
  cmd_json="$(printf '%s\n' "$@" | python3 -c 'import json,sys; print(json.dumps([l.rstrip("\n") for l in sys.stdin]))')"
  overrides="{\"containerOverrides\":[{\"name\":\"api\",\"command\":$cmd_json}]}"

  bold "[task] $desc"
  local arn
  arn="$(aws ecs run-task --region "$REGION" \
    --cluster "$CLUSTER" --launch-type FARGATE --task-definition "$TASK_FAMILY" \
    --network-configuration "awsvpcConfiguration={subnets=[$subnets],securityGroups=[$ecs_sg],assignPublicIp=ENABLED}" \
    --overrides "$overrides" \
    --query 'tasks[0].taskArn' --output text)"
  [[ -n "$arn" && "$arn" != "None" ]] || die "run-task did not start (check task def / subnets)"
  info "task: $arn — waiting for it to stop…"
  aws ecs wait tasks-stopped --cluster "$CLUSTER" --tasks "$arn" --region "$REGION"
  local code
  code="$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$arn" --region "$REGION" \
    --query 'tasks[0].containers[0].exitCode' --output text)"
  info "exit code: $code (logs in CloudWatch /ecs/$TASK_FAMILY)"
  [[ "$code" == "0" ]] || die "$desc failed (exit $code) — inspect the log group /ecs/$TASK_FAMILY"
}

cmd_migrate() {
  require_cmd aws; require_cmd python3
  require_stack
  run_task "manage.py migrate --noinput" python manage.py migrate --noinput
  run_task "manage.py post_deploy_check" python manage.py post_deploy_check
}

cmd_frontend() {
  require_cmd aws; require_cmd npm
  require_stack
  bold "[frontend] build SPA + sync to S3 + invalidate CloudFront"
  AWS_REGION="$REGION" \
    VITE_API_URL="$(tf_output api_base_url)" \
    FRONTEND_BUCKET="$(tf_output web_bucket)" \
    CLOUDFRONT_ID="$(tf_output cloudfront_distribution_id)" \
    "$ROOT/scripts/phase1-deploy-frontend.sh"
}

cmd_webhook() {
  require_cmd aws
  require_stack
  local secret="${1:-${STRIPE_WEBHOOK_SECRET:-}}"
  [[ -n "$secret" ]] || die "Usage: $0 webhook whsec_...   (add the Dashboard endpoint first)"
  bold "[webhook] store STRIPE_WEBHOOK_SECRET + roll service"
  aws ssm put-parameter --region "$REGION" --name /love/STRIPE_WEBHOOK_SECRET \
    --type SecureString --value "$secret" --overwrite >/dev/null
  aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --force-new-deployment --region "$REGION" >/dev/null
  aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE" --region "$REGION"
  info "webhook secret stored; service rolled"
}

cmd_verify() {
  require_cmd curl
  require_stack
  local url; url="$(tf_output api_base_url)"
  bold "[verify] GET $url/health/"
  curl -fsS "$url/health/" && echo
  info "Now run one real test donation (4242 4242 4242 4242) and confirm:"
  info "  Stripe webhook delivery 200 → donation 'confirmed' + a LedgerEntry row."
}

cmd_all() {
  cmd_infra
  cmd_ssm
  cmd_image
  cmd_migrate
  cmd_frontend
  cmd_verify
  bold "[all] done. Remaining interactive steps:"
  info "  $0 acm api.YOURDOMAIN.com   (HTTPS — required before the SPA can call the API)"
  info "  $0 webhook whsec_...        (after adding the Stripe Dashboard endpoint)"
}

main() {
  local command="${1:-}"; shift || true
  case "$command" in
    infra)    cmd_infra "$@" ;;
    acm)      cmd_acm "$@" ;;
    ssm)      cmd_ssm "$@" ;;
    image)    cmd_image "$@" ;;
    migrate)  cmd_migrate "$@" ;;
    frontend) cmd_frontend "$@" ;;
    webhook)  cmd_webhook "$@" ;;
    verify)   cmd_verify "$@" ;;
    all)      cmd_all "$@" ;;
    ""|-h|--help|help)
      awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"
      ;;
    *) die "unknown command: $command (try: $0 help)" ;;
  esac
}

main "$@"
