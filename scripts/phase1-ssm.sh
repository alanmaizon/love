#!/usr/bin/env bash
# Overwrite /love/* SSM parameters after terraform apply.
# Usage: AWS_REGION=eu-west-1 FRONTEND_URL=https://xxx API_URL=http://alb... ./scripts/phase1-ssm.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGION="${AWS_REGION:-eu-west-1}"
PREFIX="/love"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
API_HOST="${API_URL#*://}"
API_HOST="${API_HOST%%/*}"

put() {
  local name="$1" type="$2" value="$3"
  aws ssm put-parameter --region "$REGION" --name "${PREFIX}/${name}" --type "$type" --value "$value" --overwrite
  echo "  set ${name}"
}

SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')"

put SECRET_KEY SecureString "$SECRET_KEY"
put DEBUG String "False"
put CORS_ALLOWED_ORIGINS String "[\"${FRONTEND_URL}\"]"
put CSRF_TRUSTED_ORIGINS String "[\"${FRONTEND_URL}\"]"
put FRONTEND_URL String "$FRONTEND_URL"
put PLATFORM_FEE_BPS String "0"
put STRIPE_CURRENCY String "eur"

MEDIA_BUCKET="${MEDIA_BUCKET:-}"
if [[ -z "$MEDIA_BUCKET" ]]; then
  MEDIA_BUCKET="$(terraform -chdir="$ROOT/infra/terraform" output -raw media_bucket 2>/dev/null || true)"
fi
if [[ -z "$MEDIA_BUCKET" ]]; then
  read -r -p "MEDIA_BUCKET: " MEDIA_BUCKET
fi
put AWS_STORAGE_BUCKET_NAME String "$MEDIA_BUCKET"
put AWS_S3_REGION_NAME String "$REGION"

echo ""
echo "Still required (edit manually or re-run with env vars):"
echo "  STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET"
echo ""
echo "Example:"
echo "  aws ssm put-parameter --region $REGION --name ${PREFIX}/STRIPE_WEBHOOK_SECRET --type SecureString --value whsec_... --overwrite"
