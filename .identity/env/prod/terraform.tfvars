domain    = "iocom"
env       = "prod"
env_short = "p"
prefix    = "io"

tags = {
  CreatedBy   = "Terraform"
  Environment = "Prod"
  Owner       = "io"
  Source      = "https://github.com/pagopa/io-functions-service-messages"
  CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
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
