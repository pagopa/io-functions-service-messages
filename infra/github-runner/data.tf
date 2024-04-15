data "azurerm_key_vault" "key_vault_common" {
  name                = local.key_vault_common.name
  resource_group_name = local.key_vault_common.resource_group_name
}

data "azurerm_container_app_environment" "container_app_environment_runner" {
  name                = local.container_app_environment.name
  resource_group_name = local.container_app_environment.resource_group_name
}
