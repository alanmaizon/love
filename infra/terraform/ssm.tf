# DATABASE_URL is wired from RDS automatically. Other secrets: set via scripts/phase1-ssm.sh

resource "aws_ssm_parameter" "database_url" {
  name  = "${local.ssm_prefix}DATABASE_URL"
  type  = "SecureString"
  value = "postgres://${var.db_username}:${var.db_password}@${aws_db_instance.main.address}:5432/${var.db_name}"

  tags = { Name = "${local.name_prefix}-database-url" }
}

resource "aws_ssm_parameter" "allowed_hosts" {
  name  = "${local.ssm_prefix}ALLOWED_HOSTS"
  type  = "String"
  value = jsonencode(compact([aws_lb.api.dns_name, var.frontend_domain != "" ? "api.${var.frontend_domain}" : ""]))

  tags = { Name = "${local.name_prefix}-allowed-hosts" }
}

locals {
  ssm_secret_names = [
    "SECRET_KEY",
    "DEBUG",
    "CORS_ALLOWED_ORIGINS",
    "CSRF_TRUSTED_ORIGINS",
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "FRONTEND_URL",
    "PLATFORM_FEE_BPS",
    "STRIPE_CURRENCY",
    "AWS_STORAGE_BUCKET_NAME",
    "AWS_S3_REGION_NAME",
  ]

  ssm_arn = {
    for k in local.ssm_secret_names :
    k => "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}${k}"
  }
}

# Placeholders — overwrite with scripts/phase1-ssm.sh before first donate test.
resource "aws_ssm_parameter" "app_secrets" {
  for_each = toset(local.ssm_secret_names)

  name  = "${local.ssm_prefix}${each.key}"
  type  = each.key == "DEBUG" || each.key == "PLATFORM_FEE_BPS" || each.key == "STRIPE_CURRENCY" ? "String" : "SecureString"
  value = each.key == "DEBUG" ? "False" : (each.key == "PLATFORM_FEE_BPS" ? "0" : (each.key == "STRIPE_CURRENCY" ? "eur" : "CHANGEME_OVERWRITE"))

  lifecycle {
    ignore_changes = [value]
  }

  tags = { Name = "${local.name_prefix}-${lower(each.key)}" }
}
