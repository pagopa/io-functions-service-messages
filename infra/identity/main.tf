terraform {
  required_version = ">=1.6.0"

  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      version = "2.33.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.98"
    }
    github = {
      source  = "integrations/github"
      version = "5.39.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = terraform-state-rg
    storage_account_name = tfappprodio
    container_name       = terraform-state
    key                  = io-functions-service-messages.identity.tfstate
  }
}

provider "azurerm" {
  features {}
}

provider "github" {
  owner = "pagopa"
}

data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}
