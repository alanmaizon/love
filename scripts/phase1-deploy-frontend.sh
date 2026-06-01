#!/usr/bin/env bash
# Build Vite app and sync to S3 + invalidate CloudFront.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGION="${AWS_REGION:-eu-west-1}"

if [[ -z "${VITE_API_URL:-}" ]]; then
  echo "Set VITE_API_URL (e.g. http://love-alb-xxx.eu-west-1.elb.amazonaws.com or https://api.yourdomain.com)"
  exit 1
fi

if [[ -z "${FRONTEND_BUCKET:-}" ]]; then
  FRONTEND_BUCKET="$(terraform -chdir="$ROOT/infra/terraform" output -raw web_bucket 2>/dev/null || true)"
fi
if [[ -z "${CLOUDFRONT_ID:-}" ]]; then
  CLOUDFRONT_ID="$(terraform -chdir="$ROOT/infra/terraform" output -raw cloudfront_distribution_id 2>/dev/null || true)"
fi

if [[ -z "${FRONTEND_BUCKET:-}" ]]; then
  read -r -p "S3 bucket name: " FRONTEND_BUCKET
fi

cd "$ROOT/love_frontend"
echo "VITE_API_URL=$VITE_API_URL" > .env.production
npm ci
npm run build

aws s3 sync dist/ "s3://${FRONTEND_BUCKET}/" --delete --region "$REGION"

if [[ -n "${CLOUDFRONT_ID:-}" ]]; then
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_ID" --paths "/*"
  echo "Invalidated CloudFront $CLOUDFRONT_ID"
fi

echo "Frontend deployed to s3://${FRONTEND_BUCKET}/"
