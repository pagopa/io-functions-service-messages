output "functions_managed_identities" {
  value = {
    app_name  = module.federated_identities.federated_cd_identity.name
  }
}
