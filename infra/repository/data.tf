data "azurerm_user_assigned_identity" "identity_prod_cd" {
  name                = local.identity_cd_name
  resource_group_name = local.identity_resource_group_name
}