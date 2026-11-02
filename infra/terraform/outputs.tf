output "image_repository" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}/spoton"
}

output "service_url" {
  value = var.service_enabled ? google_cloud_run_v2_service.app[0].uri : null
}

# Set these as GitHub repository variables (not secrets: none of them grants access on its own).
output "github_variables" {
  value = {
    GCP_PROJECT_ID   = var.project_id
    GCP_REGION       = var.region
    GCP_WIF_PROVIDER = google_iam_workload_identity_pool_provider.github.name
    GCP_DEPLOYER_SA  = google_service_account.deployer.email
  }
}
