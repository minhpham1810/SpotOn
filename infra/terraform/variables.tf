variable "project_id" {
  description = "GCP project that holds everything SpotOn creates."
  type        = string
}

variable "billing_account_id" {
  description = "Billing account for the budget alert (XXXXXX-XXXXXX-XXXXXX)."
  type        = string
}

variable "region" {
  type    = string
  default = "us-east1"
}

variable "github_repository" {
  description = "owner/name, used only for labels and docs."
  type        = string
  default     = "minhpham1810/SpotOn"
}

variable "github_repository_id" {
  description = "Numeric repo ID. Trusting the ID, not the name, means a deleted-and-recreated repo with the same name can't deploy."
  type        = string
  default     = "944923077"
}

variable "service_enabled" {
  description = "Cloud Run exists only while true. Everything else is free-tier and stays."
  type        = bool
  default     = false
}

variable "image" {
  description = "Image for the first create of the service. Later deploys come from CI, and Terraform ignores image changes."
  type        = string
  default     = ""
}

variable "spotify_client_id" {
  description = "Public Spotify client ID (server side, for app-token calls)."
  type        = string
  default     = ""
}

variable "upstash_redis_rest_url" {
  description = "Upstash REST URL (not a secret; the token is)."
  type        = string
  default     = ""
}

variable "budget_amount_usd" {
  type    = number
  default = 5
}
