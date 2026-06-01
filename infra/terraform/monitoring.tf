# Lightweight alarms for Phase 3 money ops (log-based + optional SNS).

resource "aws_cloudwatch_log_metric_filter" "webhook_failed" {
  name           = "${local.name_prefix}-webhook-handler-failed"
  log_group_name = aws_cloudwatch_log_group.api.name
  pattern        = "Webhook handler failed"

  metric_transformation {
    name      = "WebhookHandlerFailed"
    namespace = "Love/MoneyOps"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "webhook_failed" {
  count               = var.alarm_sns_topic_arn != "" ? 1 : 0
  alarm_name          = "${local.name_prefix}-webhook-handler-failed"
  alarm_description   = "Stripe webhook handler logged an exception"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "WebhookHandlerFailed"
  namespace           = "Love/MoneyOps"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"

  alarm_actions = [var.alarm_sns_topic_arn]
  ok_actions    = [var.alarm_sns_topic_arn]
}
