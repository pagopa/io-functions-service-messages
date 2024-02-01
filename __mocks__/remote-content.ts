import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { NewRCConfiguration } from "@pagopa/io-functions-commons/dist/generated/definitions/NewRCConfiguration";
import { HasPreconditionEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/HasPrecondition";
import {
  RCConfiguration,
  RCConfigurationModel
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";

const aDetailAuthentication = {
  headerKeyName: "a" as NonEmptyString,
  key: "key" as NonEmptyString,
  type: "type" as NonEmptyString
};

export const aRemoteContentConfiguration: RCConfiguration = {
  hasPrecondition: HasPreconditionEnum.ALWAYS,
  disableLollipopFor: [],
  isLollipopEnabled: false,
  configurationId: "aValidUlid" as Ulid,
  userId: "aUserId" as NonEmptyString,
  name: "aRemoteContentConfiguration" as NonEmptyString,
  description: "a description" as NonEmptyString,
  prodEnvironment: {
    baseUrl: "aValidUrl" as NonEmptyString,
    detailsAuthentication: aDetailAuthentication
  }
};

export const aNewRemoteContentConfiguration: NewRCConfiguration = {
  hasPrecondition: HasPreconditionEnum.ALWAYS,
  disableLollipopFor: [],
  isLollipopEnabled: false,
  userId: "aUserId" as NonEmptyString,
  name: "aRemoteContentConfiguration" as NonEmptyString,
  description: "a description" as NonEmptyString,
  prodEnvironment: {
    baseUrl: "aValidUrl" as NonEmptyString,
    detailsAuthentication: aDetailAuthentication
  }
};

export const createNewConfigurationMock = jest.fn();

export const rccModelMock = ({
  create: createNewConfigurationMock
} as unknown) as RCConfigurationModel;
