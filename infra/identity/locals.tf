locals {
  prefix     = "io"
  env_short  = "p"
  project    = "${local.prefix}-${local.env_short}"
  domain     = "iocom"
  repository = "io-functions-services-messages"

  resource_group_name = "${local.project}-service-messages-rg"
  functions_app_name  = "${local.project}-messages-sending-func"

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

  web_apps_environment_cd_roles = {
    subscription = []
    resource_groups = {
      "io-p-github-runner-rg" = [
        "Contributor",
      ],
      "io-p-service-messages-rg" = [
        "Contributor",
      ]
    }
  }

  tags = {
    CreatedBy   = "Terraform"
    Environment = "Prod"
    Owner       = "IO"
    Source      = "https://github.com/pagopa/io-functions-service-messages"
    CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
  }
}
