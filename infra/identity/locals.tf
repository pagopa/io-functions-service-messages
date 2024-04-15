locals {
  prefix    = "io"
  env_short = "p"
  env       = "prod"
  domain    = "functions-services-messages"
  repo_name = "${local.prefix}-${local.domain}"

  tags = {
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    Owner          = "IO"
    Source         = "https://github.com/pagopa/io-functions-service-messages/infra/identity"
    CostCenter     = "TS310 - PAGAMENTI & SERVIZI"
    ManagementTeam = "IO Comunicazione"
  }
}
