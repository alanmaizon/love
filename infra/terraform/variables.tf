variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "project" {
  type    = string
  default = "love"
}

variable "db_username" {
  type    = string
  default = "loveadmin"
}

variable "db_password" {
  type      = string
  sensitive = true
  description = "RDS master password — pass via TF_VAR_db_password or -var-file"
}

variable "db_name" {
  type    = string
  default = "love"
}

variable "frontend_domain" {
  type        = string
  description = "Public site hostname, e.g. lovethatgivesback.com (for CORS/CSRF docs — set in SSM manually)"
  default     = ""
}

variable "api_desired_count" {
  type    = number
  default = 1
}

variable "fargate_cpu" {
  type    = number
  default = 256
}

variable "fargate_memory" {
  type    = number
  default = 512
}

variable "api_acm_certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate ARN in the same region (eu-west-1) for HTTPS on the API ALB. Required before the HTTPS CloudFront SPA can call the API (mixed content)."
}

variable "enable_scheduled_tasks" {
  type        = bool
  default     = true
  description = "EventBridge → ECS RunTask for drain_outbox (5m) and daily reconcile/ops_health"
}

variable "alarm_sns_topic_arn" {
  type        = string
  default     = ""
  description = "Optional SNS topic ARN for webhook-failure CloudWatch alarm"
}
