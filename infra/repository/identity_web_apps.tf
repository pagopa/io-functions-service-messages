module "web_apps_identity_cd" {
  source = "github.com/pagopa/terraform-azurerm-v3//github_federated_identity?ref=v7.34.2"

  prefix    = local.prefix
  env_short = local.env_short
  domain    = local.domain

  identity_role = "cd"

  github_federations = local.github_federations

  cd_rbac_roles = {
    subscription_roles = locals.web_apps_environment_cd_roles.subscription
    resource_groups    = locals.web_apps_environment_cd_roles.resource_groups
  }

  tags = locals.tags
}
