# Admin account reactivation secret
# This secret is used to authenticate admin requests to /api/admin/account/reactivate

# Generate a random secret for admin reactivation
resource "random_password" "admin_reactivation_secret" {
  count   = var.admin_reactivation_secret == "" ? 1 : 0
  length  = 32
  special = false
}

# Store the secret in AWS Secrets Manager
resource "aws_secretsmanager_secret" "admin_reactivation_secret" {
  name        = "conversational-ui-admin-reactivation${local.environment_name_suffix}"
  description = "Admin secret for account reactivation API (/api/admin/account/reactivate)"
}

resource "aws_secretsmanager_secret_version" "admin_reactivation_secret_current" {
  secret_id     = aws_secretsmanager_secret.admin_reactivation_secret.id
  secret_string = var.admin_reactivation_secret != "" ? var.admin_reactivation_secret : random_password.admin_reactivation_secret[0].result
}

# Output the secret ARN and a masked version of the secret
output "admin_reactivation_secret_arn" {
  description = "ARN of the admin reactivation secret in Secrets Manager"
  value       = aws_secretsmanager_secret.admin_reactivation_secret.arn
}

output "admin_reactivation_secret_value" {
  description = "The admin reactivation secret value (sensitive)"
  value       = var.admin_reactivation_secret != "" ? var.admin_reactivation_secret : random_password.admin_reactivation_secret[0].result
  sensitive   = true
}
