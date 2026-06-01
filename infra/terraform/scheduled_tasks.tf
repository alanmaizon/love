# Scheduled management commands (drain_outbox, ops health, reconciliation).

resource "aws_iam_role" "events_ecs" {
  count = var.enable_scheduled_tasks ? 1 : 0
  name  = "${local.name_prefix}-events-ecs"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "events_ecs_run" {
  count = var.enable_scheduled_tasks ? 1 : 0
  name  = "${local.name_prefix}-events-ecs-run"
  role  = aws_iam_role.events_ecs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["ecs:RunTask"]
        Resource = [
          aws_ecs_task_definition.api.arn,
          "${replace(aws_ecs_task_definition.api.arn, ":${aws_ecs_task_definition.api.revision}", ":*")}",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = [aws_iam_role.ecs_execution.arn, aws_iam_role.ecs_task.arn]
      },
    ]
  })
}

locals {
  ecs_scheduled_network = {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }
}

resource "aws_cloudwatch_event_rule" "drain_outbox" {
  count               = var.enable_scheduled_tasks ? 1 : 0
  name                = "${local.name_prefix}-drain-outbox"
  description         = "Process receipt/email outbox every 5 minutes"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "drain_outbox" {
  count     = var.enable_scheduled_tasks ? 1 : 0
  rule      = aws_cloudwatch_event_rule.drain_outbox[0].name
  target_id = "drain-outbox"
  arn       = aws_ecs_cluster.main.arn
  role_arn  = aws_iam_role.events_ecs[0].arn

  ecs_target {
    task_count          = 1
    task_definition_arn = aws_ecs_task_definition.api.arn
    launch_type         = "FARGATE"
    platform_version    = "LATEST"

    network_configuration {
      subnets          = local.ecs_scheduled_network.subnets
      security_groups  = local.ecs_scheduled_network.security_groups
      assign_public_ip = local.ecs_scheduled_network.assign_public_ip
    }
  }

  input = jsonencode({
    containerOverrides = [{
      name = "api"
      command = [
        "python", "manage.py", "drain_outbox",
      ]
    }]
  })
}

resource "aws_cloudwatch_event_rule" "ops_daily" {
  count               = var.enable_scheduled_tasks ? 1 : 0
  name                = "${local.name_prefix}-ops-daily"
  description         = "Daily reconciliation + ops health (06:00 UTC)"
  schedule_expression = "cron(0 6 * * ? *)"
}

resource "aws_cloudwatch_event_target" "ops_reconcile" {
  count     = var.enable_scheduled_tasks ? 1 : 0
  rule      = aws_cloudwatch_event_rule.ops_daily[0].name
  target_id = "reconcile-stripe"
  arn       = aws_ecs_cluster.main.arn
  role_arn  = aws_iam_role.events_ecs[0].arn

  ecs_target {
    task_count          = 1
    task_definition_arn = aws_ecs_task_definition.api.arn
    launch_type         = "FARGATE"
    platform_version    = "LATEST"

    network_configuration {
      subnets          = local.ecs_scheduled_network.subnets
      security_groups  = local.ecs_scheduled_network.security_groups
      assign_public_ip = local.ecs_scheduled_network.assign_public_ip
    }
  }

  input = jsonencode({
    containerOverrides = [{
      name = "api"
      command = [
        "python", "manage.py", "reconcile_stripe", "--since-days", "30",
      ]
    }]
  })
}

resource "aws_cloudwatch_event_target" "ops_health" {
  count     = var.enable_scheduled_tasks ? 1 : 0
  rule      = aws_cloudwatch_event_rule.ops_daily[0].name
  target_id = "ops-health"
  arn       = aws_ecs_cluster.main.arn
  role_arn  = aws_iam_role.events_ecs[0].arn

  ecs_target {
    task_count          = 1
    task_definition_arn = aws_ecs_task_definition.api.arn
    launch_type         = "FARGATE"
    platform_version    = "LATEST"

    network_configuration {
      subnets          = local.ecs_scheduled_network.subnets
      security_groups  = local.ecs_scheduled_network.security_groups
      assign_public_ip = local.ecs_scheduled_network.assign_public_ip
    }
  }

  input = jsonencode({
    containerOverrides = [{
      name = "api"
      command = [
        "python", "manage.py", "ops_health",
      ]
    }]
  })
}
