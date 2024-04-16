module "container_app_job" {
  source = "github.com/pagopa/terraform-azurerm-v3//container_app_job_gh_runner?ref=v7.76.0"

  location  = local.location
  prefix    = local.prefix
  env_short = local.env_short

  key_vault = {
    resource_group_name = data.azurerm_key_vault.key_vault_common.resource_group_name
    name                = data.azurerm_key_vault.key_vault_common.name
    secret_name         = "github-runner-pat"
  }

  environment = {
    name                = data.azurerm_container_app_environment.container_app_environment_runner.name
    resource_group_name = data.azurerm_container_app_environment.container_app_environment_runner.resource_group_name
  }

  job = {
    name = "f-services-messages"
    repo = "io-functions-services-messages"
  }

  tags = local.tags
}
