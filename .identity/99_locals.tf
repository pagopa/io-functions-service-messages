locals {
  prefix  = "${var.prefix}-${var.env_short}"

  resource_group_name = "io-p-service-messages-rg"
  functions_app_name = "io-p-messages-sending-func"

  github_federations = tolist([
    {
      repository = "io-functions-service-messages"
      subject    = "prod-cd"
    }
  ])

  repo_secrets = {
    "AZURE_SUBSCRIPTION_ID" = data.azurerm_client_config.current.subscription_id
    "AZURE_TENANT_ID"       = data.azurerm_client_config.current.tenant_id
  }
}
