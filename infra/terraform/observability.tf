# Metrics come from the one-JSON-line-per-request logs written by server/index.ts:
# Cloud Run lifts `httpRequest` and `severity` into the LogEntry and keeps the rest in jsonPayload.
# Pricing checked 2026-11-01: user-defined log-based metrics are chargeable custom metrics
# (first 150 MiB/month free; this is KB). Alerting policies are free until 2027-09-01, then
# $0.35/month per metric reference: set alerts_enabled = false before then if not wanted.

variable "alert_email" {
  description = "Where alerts go."
  type        = string
  default     = ""
}

variable "alerts_enabled" {
  type    = bool
  default = true
}

locals {
  app_logs = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="spoton"
    logName="projects/${var.project_id}/logs/run.googleapis.com%2Fstdout"
  EOT
}

resource "google_logging_metric" "report_requests" {
  name   = "spoton/report_requests"
  filter = "${local.app_logs} jsonPayload.reportSource:*"

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    labels {
      key         = "source"
      value_type  = "STRING"
      description = "cache, fresh, limited or limiter-down"
    }
  }
  label_extractors = {
    source = "EXTRACT(jsonPayload.reportSource)"
  }
}

resource "google_logging_metric" "fresh_report_latency" {
  name   = "spoton/fresh_report_latency"
  filter = "${local.app_logs} jsonPayload.reportSource=\"fresh\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "DISTRIBUTION"
    unit        = "ms"
  }
  value_extractor = "EXTRACT(jsonPayload.durationMs)"
  bucket_options {
    exponential_buckets {
      num_finite_buckets = 16
      growth_factor      = 2
      scale              = 10
    }
  }
}

resource "google_monitoring_notification_channel" "email" {
  count        = var.alerts_enabled && var.alert_email != "" ? 1 : 0
  display_name = "SpotOn owner"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }
}

locals {
  alerts = {
    limiter_down = {
      name      = "SpotOn: rate limiter cannot reach Redis"
      severity  = "CRITICAL" # every fresh report fails
      doc       = "Fresh reports are being refused with 503. Check the Upstash database (free databases are deleted after 14 days idle) and UPSTASH_* settings. Runbook: docs/ops/runbook.md"
      filter    = "metric.type=\"logging.googleapis.com/user/spoton/report_requests\" AND metric.label.source=\"limiter-down\""
      threshold = 0
      window    = "300s"
    }
    rate_limited_spike = {
      name      = "SpotOn: rate-limit spike (possible abuse)"
      severity  = "WARNING" # spend is still capped
      doc       = "More than 50 requests were refused by the rate limiter in 10 minutes. Spend is still capped; check logs for the pattern and consider scripts/demo-down.sh."
      filter    = "metric.type=\"logging.googleapis.com/user/spoton/report_requests\" AND metric.label.source=\"limited\""
      threshold = 50
      window    = "600s"
    }
  }
}

resource "google_monitoring_alert_policy" "reports" {
  for_each     = var.alerts_enabled ? local.alerts : {}
  display_name = each.value.name
  severity     = each.value.severity
  combiner     = "OR"

  conditions {
    display_name = each.value.name
    condition_threshold {
      filter          = "${each.value.filter} AND resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = each.value.threshold
      duration        = "0s"
      aggregations {
        alignment_period     = each.value.window
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
      }
      trigger {
        count = 1
      }
    }
  }

  documentation {
    content = each.value.doc
  }
  notification_channels = google_monitoring_notification_channel.email[*].id
}

# Server errors, from the logs' own severity (no custom metric needed).
resource "google_logging_metric" "server_errors" {
  name   = "spoton/server_errors"
  filter = "${local.app_logs} severity>=ERROR"
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_monitoring_alert_policy" "server_errors" {
  count        = var.alerts_enabled ? 1 : 0
  display_name = "SpotOn: server errors"
  severity     = "ERROR"
  combiner     = "OR"

  conditions {
    display_name = "More than 5 ERROR log lines in 5 minutes"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.server_errors.name}\" AND resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 5
      duration        = "0s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  documentation {
    content = "Check `gcloud run services logs read spoton --region us-east1` for the failing requests; roll back with the runbook if a deploy caused it."
  }
  notification_channels = google_monitoring_notification_channel.email[*].id
}
