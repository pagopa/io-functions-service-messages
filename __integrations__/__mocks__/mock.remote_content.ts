import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { NewRCConfigurationPublic } from "@pagopa/io-functions-commons/dist/generated/definitions/NewRCConfigurationPublic";
import { HasPreconditionEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/HasPrecondition";
import { RCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";

export const aPublicDetailAuthentication = {
  header_key_name: "a" as NonEmptyString,
  key: "key" as NonEmptyString,
  type: "type" as NonEmptyString
};

export const aModelDetailAuthentication = {
  headerKeyName: "a" as NonEmptyString,
  key: "key" as NonEmptyString,
  type: "type" as NonEmptyString
};

export const aNewRemoteContentConfiguration: NewRCConfigurationPublic = {
  has_precondition: HasPreconditionEnum.ALWAYS,
  disable_lollipop_for: [],
  is_lollipop_enabled: false,
  name: "aRemoteContentConfiguration" as NonEmptyString,
  description: "a description" as NonEmptyString,
  prod_environment: {
    base_url: "aValidUrl" as NonEmptyString,
    details_authentication: aPublicDetailAuthentication
  }
};

export const aRemoteContentConfiguration: RCConfiguration = {
  hasPrecondition: HasPreconditionEnum.ALWAYS,
  disableLollipopFor: [],
  isLollipopEnabled: false,
  userId: "aUserId" as NonEmptyString,
  name: "aRemoteContentConfiguration" as NonEmptyString,
  description: "a description" as NonEmptyString,
  configurationId: "01HNG1XBMT8V6HWGF5T053K9RJ" as Ulid,
  prodEnvironment: {
    baseUrl: "aValidUrl" as NonEmptyString,
    detailsAuthentication: aModelDetailAuthentication
  }
};

export const aPublicRemoteContentConfiguration = {
  configuration_id: "01HNG1XBMT8V6HWGF5T053K9RJ",
  description: "a description",
  disable_lollipop_for: [],
  has_precondition: "ALWAYS",
  is_lollipop_enabled: false,
  name: "aRemoteContentConfiguration",
  prod_environment: {
    base_url: "aValidUrl",
    details_authentication: {
      header_key_name: "a",
      key: "key",
      type: "type"
    }
  }
};
