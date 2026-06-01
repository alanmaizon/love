output "alb_dns_name" {
  description = "ALB hostname (use api_base_url for scheme)"
  value       = aws_lb.api.dns_name
}

output "api_base_url" {
  description = "Use as VITE_API_URL once HTTPS is enabled (set api_acm_certificate_arn)"
  value       = "${local.api_url_scheme}://${aws_lb.api.dns_name}"
}

output "cloudfront_domain" {
  description = "Frontend URL (default cert)"
  value       = "https://${aws_cloudfront_distribution.web.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "For CloudFront invalidation / GitHub CLOUDFRONT_DISTRIBUTION_ID"
  value       = aws_cloudfront_distribution.web.id
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service" {
  value = aws_ecs_service.api.name
}

output "rds_endpoint" {
  value = aws_db_instance.main.address
}

output "web_bucket" {
  value = aws_s3_bucket.web.bucket
}

output "media_bucket" {
  value = aws_s3_bucket.media.bucket
}

output "ssm_prefix" {
  value = local.ssm_prefix
}

output "github_deploy_vars" {
  description = "Set as GitHub Actions repository variables"
  value = {
    AWS_REGION      = var.aws_region
    ECR_REPOSITORY  = aws_ecr_repository.api.name
    ECS_CLUSTER     = aws_ecs_cluster.main.name
    ECS_SERVICE     = aws_ecs_service.api.name
    CLOUDFRONT_ID   = aws_cloudfront_distribution.web.id
    FRONTEND_BUCKET = aws_s3_bucket.web.bucket
  }
}
