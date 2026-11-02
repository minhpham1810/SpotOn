# GitHub Actions gets short-lived Google credentials by presenting its OIDC token.
# No JSON key exists anywhere.

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions"
  depends_on                = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"          = "assertion.sub"
    "attribute.repository_id" = "assertion.repository_id"
    "attribute.ref"           = "assertion.ref"
    "attribute.repository"    = "assertion.repository"
  }

  # Only workflow runs from this exact repo on master can get a token. PRs (including forks) cannot.
  attribute_condition = "assertion.repository_id == \"${var.github_repository_id}\" && assertion.ref == \"refs/heads/master\""
}

# The identity CI acts as: push images, roll out revisions, nothing else.
resource "google_service_account" "deployer" {
  account_id   = "spoton-deployer"
  display_name = "SpotOn GitHub Actions deployer"
  depends_on   = [google_project_service.apis]
}

resource "google_service_account_iam_member" "github_impersonates_deployer" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository_id/${var.github_repository_id}"
}

resource "google_artifact_registry_repository_iam_member" "deployer_pushes" {
  repository = google_artifact_registry_repository.images.name
  location   = var.region
  role       = "roles/artifactregistry.writer"
  member     = google_service_account.deployer.member
}

# run.developer can update services but not change who may invoke them (that needs run.admin).
resource "google_project_iam_member" "deployer_runs" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = google_service_account.deployer.member
}

# Deploying a revision that runs as spoton-runtime requires "act as" on that one account only.
resource "google_service_account_iam_member" "deployer_acts_as_runtime" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.deployer.member
}
