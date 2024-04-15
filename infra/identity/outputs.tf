output "functions_managed_identity_ci" {
  value = {
    app_name = module.federated_identities.federated_ci_identity.name
  }
}

output "functions_managed_identity_cd" {
  value = {
    app_name = module.federated_identities.federated_cd_identity.name
  }
}
