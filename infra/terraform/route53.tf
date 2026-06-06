# Route 53 zone for the root domain. Created up-front (non-destructive — the world
# keeps using the current registrar NS until you switch nameservers to the NS
# output below). Records below faithfully reproduce the existing HostGator zone so
# email (Zoho MX/SPF/DKIM + Titan webmail) keeps working after the cutover.
#
# Cutover sequence:
#   1. terraform apply (manage_dns = true)        -> zone + records exist in AWS
#   2. dig @<route53 NS> <record>                 -> verify answers match HostGator
#   3. switch registrar NS -> the 4 route53_zone NS
#   4. wait for propagation; certs validate; then set enable_apex = true and apply

locals {
  r53_enabled = var.manage_dns && var.root_domain != ""
}

resource "aws_route53_zone" "main" {
  count = local.r53_enabled ? 1 : 0
  name  = var.root_domain
}

# --- Email + parking (reproduced exactly from the HostGator export) ---

resource "aws_route53_record" "mx" {
  count   = local.r53_enabled ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.root_domain
  type    = "MX"
  ttl     = 3600
  records = [
    "10 mx.zoho.eu",
    "20 mx2.zoho.eu",
    "50 mx3.zoho.eu",
  ]
}

resource "aws_route53_record" "txt_apex" {
  count   = local.r53_enabled ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.root_domain
  type    = "TXT"
  ttl     = 3600
  records = [
    "v=spf1 include:zohomail.eu include:spf.titan.email ~all",
    "zoho-verification=zb04544936.zmverify.zoho.eu",
    "v=DMARC1;p=none;sp=none;adkim=r;aspf=r;pct=100",
  ]
}

resource "aws_route53_record" "dkim_zmail" {
  count   = local.r53_enabled ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "zmail._domainkey.${var.root_domain}"
  type    = "TXT"
  ttl     = 3600
  records = ["v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCW/tCgS3Y4lO+BQor/kornF0vTNWArTQzQmx11qtqLZIizlUp5sg8YK68NQPni3WcR145yJZqiiIoA2GveQDI3cbhNnWIZ4YMoPzY4DmsomFLN73RI/b5Q1lZqTfjrUj4DzYW/wXGlPcKYjo4C12GY3ged9Jr2M8q7G57R9Is7mQIDAQAB"]
}

resource "aws_route53_record" "mail" {
  count   = local.r53_enabled ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "mail.${var.root_domain}"
  type    = "CNAME"
  ttl     = 3600
  records = ["hostgator.titan.email"]
}

resource "aws_route53_record" "wildcard" {
  count   = local.r53_enabled ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "*.${var.root_domain}"
  type    = "A"
  ttl     = 3600
  records = ["208.91.197.13"]
}

# --- App records (alias = no extra query charge, apex-capable) ---

resource "aws_route53_record" "api" {
  count   = local.r53_enabled ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "api.${var.root_domain}"
  type    = "A"

  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}

# www as a literal CNAME (not an alias to the CloudFront resource) so this record
# has no dependency on the CloudFront distribution — that keeps DNS applies
# decoupled from the HTTPS/cert wiring until the certs are issued.
resource "aws_route53_record" "www" {
  count   = local.r53_enabled ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "www.${var.root_domain}"
  type    = "CNAME"
  ttl     = 3600
  records = ["d31xnjpit4k76i.cloudfront.net"]
}

# Apex -> CloudFront. Only valid once the frontend cert includes the apex
# (enable_apex), otherwise apex TLS would mismatch the www-only cert.
resource "aws_route53_record" "apex" {
  count   = local.r53_enabled && var.enable_apex ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.root_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web.domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

# Existing api ACM validation CNAME (eu-west-1, CLI-managed cert), reproduced so it
# validates + auto-renews after the NS cutover. The www/frontend cert's validation
# records are managed by aws_route53_record.frontend_cert_validation instead.
resource "aws_route53_record" "acm_api_validation" {
  count   = local.r53_enabled ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "_eca3fe140a9c4fefdeb63301955c0084.api.${var.root_domain}"
  type    = "CNAME"
  ttl     = 3600
  records = ["_f1566efca2f81a5f4b9d417172a949f3.jkddzztszm.acm-validations.aws"]
}

output "route53_nameservers" {
  description = "Set these as the domain's nameservers at the registrar (HostGator) to cut over."
  value       = local.r53_enabled ? aws_route53_zone.main[0].name_servers : []
}
