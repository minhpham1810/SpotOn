terraform {
  required_version = ">= 1.9"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.9"
    }
  }

  # shortcut: local state (terraform.tfstate, gitignored); move to a GCS backend if more than one machine applies.
}

provider "google" {
  project = var.project_id
  region  = var.region
  # Budgets API bills the quota to this project instead of the caller's default.
  user_project_override = true
  billing_project       = var.project_id
}
