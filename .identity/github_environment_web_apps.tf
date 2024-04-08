resource "github_repository_environment" "messages_sending" {
  environment = local.functions_app_name
  repository  = var.github.repository
  reviewers {
    teams = [data.github_team.maintainers.id]
  }
}

resource "github_actions_environment_secret" "web_app_client_id" {
  repository      = var.github.repository
  environment     = github_repository_environment.messages_sending.environment
  secret_name     = "AZURE_CLIENT_ID"
  plaintext_value = module.web_apps_identity_cd.identity_client_id
}

resource "github_actions_environment_variable" "web_app_resouce_group" {
  repository    = var.github.repository
  environment   = github_repository_environment.messages_sending.environment
  variable_name = "AZURE_WEB_APP_RESOURCE_GROUP"
  value         = local.resource_group_name
}

resource "github_actions_environment_variable" "web_app_names" {
  repository    = var.github.repository
  environment   = github_repository_environment.messages_sending.environment
  variable_name = "AZURE_WEB_APP_NAME"
  value         = local.functions_app_name
}

resource "github_actions_environment_variable" "health_check_path" {
  repository    = var.github.repository
  environment   = github_repository_environment.messages_sending.environment
  variable_name = "HEALTH_CHECK_PATH"
  value         = "/api/v1/info"
}
