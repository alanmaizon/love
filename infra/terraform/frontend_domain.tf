# Frontend custom domain (CloudFront). Gated on var.frontend_domain — when empty,
# CloudFront serves on its default *.cloudfront.net domain (no cert needed).
#
# CloudFront requires its ACM cert in us-east-1. We use DNS validation but do NOT
# manage the DNS records here (the zone lives at HostGator), so the validation
# resource simply waits until you add the printed CNAME and ACM issues the cert.

locals {
  # Add the apex as a SAN once enable_apex is on (after the NS cutover, so ACM can
  # validate via Route 53).
  frontend_san = var.enable_apex && var.root_domain != "" ? [var.root_domain] : []
}

resource "aws_acm_certificate" "frontend" {
  count                     = var.frontend_domain != "" ? 1 : 0
  provider                  = aws.us_east_1
  domain_name               = var.frontend_domain
  subject_alternative_names = local.frontend_san
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${local.name_prefix}-frontend-cert" }
}

# When Route 53 is authoritative, create the cert's validation records there so ACM
# validates automatically (no manual CNAMEs, and renewals stay hands-off).
resource "aws_route53_record" "frontend_cert_validation" {
  for_each = local.r53_enabled && var.frontend_domain != "" ? {
    for o in aws_acm_certificate.frontend[0].domain_validation_options : o.domain_name => {
      name   = o.resource_record_name
      type   = o.resource_record_type
      record = o.resource_record_value
    }
  } : {}

  zone_id         = aws_route53_zone.main[0].zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 60
  records         = [each.value.record]
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "frontend" {
  count                   = var.frontend_domain != "" ? 1 : 0
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.frontend[0].arn
  validation_record_fqdns = local.r53_enabled ? [for r in aws_route53_record.frontend_cert_validation : r.fqdn] : null

  timeouts {
    create = "60m"
  }
}

# DNS CNAME(s) to add at your registrar to validate the CloudFront cert.
output "frontend_cert_validation_records" {
  description = "Add these CNAME records at HostGator to validate the frontend (CloudFront) cert."
  value = var.frontend_domain != "" ? [
    for o in aws_acm_certificate.frontend[0].domain_validation_options : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  ] : []
}

# Where to point the frontend hostname once the distribution is deployed.
output "frontend_cname_target" {
  description = "Point your frontend host (e.g. www) at this CloudFront domain."
  value       = aws_cloudfront_distribution.web.domain_name
}

# Public site URL — the custom domain when set, else the CloudFront default.
# Drives FRONTEND_URL / CORS / CSRF.
output "frontend_url" {
  value = var.frontend_domain != "" ? "https://${var.frontend_domain}" : "https://${aws_cloudfront_distribution.web.domain_name}"
}
