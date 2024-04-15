locals {
  prefix     = "io"
  env_short  = "p"
  domain     = "functions-services-messages"
  repository = "${locals.prefix}-${locals.domain}"

  tags = {
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    Owner          = "IO"
    Source         = "https://github.com/pagopa/io-functions-service-messages/infra/identity"
    CostCenter     = "TS310 - PAGAMENTI & SERVIZI"
    ManagementTeam = "IO Comunicazione"
  }
}
