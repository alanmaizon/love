locals {
  name_prefix    = var.project
  azs            = slice(data.aws_availability_zones.available.names, 0, 2)
  ssm_prefix     = "/${var.project}/"
  api_url_scheme = var.api_acm_certificate_arn != "" ? "https" : "http"
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}
