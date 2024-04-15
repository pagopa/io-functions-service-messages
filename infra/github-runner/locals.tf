locals {
  location  = "westeurope"
  prefix    = "io"
  env_short = "p"
  project   = "${local.prefix}-${local.env_short}"

  key_vault_common = {
    name                = "${local.project}-kv-common"
    resource_group_name = "${local.project}-rg-common"
  }

  container_app_environment = {
    name                = "${local.project}-github-runner-cae"
    resource_group_name = "${local.project}-github-runner-rg"
  }

  tags = {
    CostCenter     = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    Owner          = "IO"
    ManagementTeam = "IO Comunicazione"
    Source         = "https://github.com/pagopa/io-functions-service-messages/tree/main/infra/github-runner"
  }
}
