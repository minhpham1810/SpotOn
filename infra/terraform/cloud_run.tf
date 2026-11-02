resource "google_cloud_run_v2_service" "app" {
  count    = var.service_enabled ? 1 : 0
  name     = "spoton"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  # Demo-only lifecycle: `service_enabled = false` must be able to delete it.
  deletion_protection = false

  template {
    service_account = google_service_account.runtime.email
    # Long SSE reports; the agent normally finishes in seconds.
    timeout = "300s"
    # Load test (loadtest/README.md): 200 concurrent streams on 1 vCPU with 0 errors and a 68 MiB peak,
    # so 80 (Cloud Run's default) is safe and means fewer instances for the same traffic.
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = 0 # scale to zero: no idle cost
      max_instance_count = 2 # hard ceiling on compute spend
    }

    containers {
      image = var.image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi" # measured peak 68 MiB under 200 streams
        }
        cpu_idle          = true # request-based billing: CPU only billed while serving
        startup_cpu_boost = false
      }

      env {
        name  = "SPOTIFY_CLIENT_ID"
        value = var.spotify_client_id
      }
      env {
        # Cloud Run's front end appends the client IP to X-Forwarded-For (verify with the spoof drill in the runbook).
        name  = "TRUSTED_PROXY_HOPS"
        value = "1"
      }
      env {
        name  = "UPSTASH_REDIS_REST_URL"
        value = var.upstash_redis_rest_url
      }

      dynamic "env" {
        for_each = google_secret_manager_secret.app
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret_id
              version = "latest"
            }
          }
        }
      }

      startup_probe {
        http_get {
          path = "/healthz"
        }
        period_seconds    = 2
        failure_threshold = 10
      }

      liveness_probe {
        http_get {
          path = "/healthz"
        }
        period_seconds = 30
      }
    }
  }

  lifecycle {
    # CI owns the image after the first create; Terraform owns everything else.
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
    precondition {
      condition     = var.image != ""
      error_message = "Set var.image (an Artifact Registry image) to create the service."
    }
  }

  depends_on = [google_secret_manager_secret_iam_member.runtime_reads]
}

# Public website: anyone may invoke it. Abuse limits live in the app and in max_instance_count.
resource "google_cloud_run_v2_service_iam_member" "public" {
  count    = var.service_enabled ? 1 : 0
  name     = google_cloud_run_v2_service.app[0].name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
