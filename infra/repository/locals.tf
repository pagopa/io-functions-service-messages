locals {
  prefix     = "io"
  env_short  = "p"
  project    = "${local.prefix}-${local.env_short}"
  domain    = "iocom"
  repository = "io-functions-services-messages"

  identity_resource_group_name = "${local.project}-identity-rg"
  resource_group_name = "${local.project}-service-messages-rg"
  functions_app_name  = "${local.project}-messages-sending-func"

  github_federations = tolist([
    {
      repository = "io-functions-service-messages"
      subject    = "prod-cd"
    }
  ])

  repo_secrets = {
    "ARM_TENANT_ID"       = data.azurerm_client_config.current.tenant_id,
    "ARM_SUBSCRIPTION_ID" = data.azurerm_subscription.current.id
  }

  ci = {
    secrets = {
      "ARM_CLIENT_ID" = data.azurerm_user_assigned_identity.identity_prod_ci.client_id
    }
  }

  cd = {
    secrets = {
      "ARM_CLIENT_ID" = data.azurerm_user_assigned_identity.identity_prod_cd.client_id
    }
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
