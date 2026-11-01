locals {
  apis = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "billingbudgets.googleapis.com",
    "cloudresourcemanager.googleapis.com",
  ]

  # Values are added out of band (scripts/gcp-set-secrets.sh) so they never land in Terraform state.
  secrets = {
    LLM_API_KEY              = "llm-api-key"
    TAVILY_API_KEY           = "tavily-api-key"
    GENIUS_ACCESS_TOKEN      = "genius-access-token"
    SPOTIFY_CLIENT_SECRET    = "spotify-client-secret"
    UPSTASH_REDIS_REST_TOKEN = "upstash-redis-rest-token"
  }
}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "images" {
  repository_id = "spoton"
  location      = var.region
  format        = "DOCKER"
  description   = "SpotOn images pushed by GitHub Actions"

  # Free tier is 0.5 GB; one image is ~80 MB compressed, so keep only the newest few.
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "keep-newest-3"
    action = "KEEP"
    most_recent_versions {
      keep_count = 3
    }
  }
  cleanup_policies {
    id     = "delete-older"
    action = "DELETE"
    condition {
      tag_state  = "ANY"
      older_than = "86400s"
    }
  }

  depends_on = [google_project_service.apis]
}

# The identity the app runs as: it can read its 5 secrets and nothing else.
resource "google_service_account" "runtime" {
  account_id   = "spoton-runtime"
  display_name = "SpotOn Cloud Run runtime"
  depends_on   = [google_project_service.apis]
}

resource "google_secret_manager_secret" "app" {
  for_each  = local.secrets
  secret_id = each.value
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_iam_member" "runtime_reads" {
  for_each  = google_secret_manager_secret.app
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.runtime.member
}

resource "google_billing_budget" "monthly" {
  billing_account = var.billing_account_id
  display_name    = "SpotOn monthly"

  budget_filter {
    projects = ["projects/${data.google_project.this.number}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.budget_amount_usd)
    }
  }

  # Email to billing admins at each threshold. This alerts; it does not stop spending.
  dynamic "threshold_rules" {
    for_each = [0.1, 0.5, 1.0]
    content {
      threshold_percent = threshold_rules.value
    }
  }

  depends_on = [google_project_service.apis]
}

data "google_project" "this" {}
