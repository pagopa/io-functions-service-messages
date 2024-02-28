import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { HasPreconditionEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/HasPrecondition";
import {
  RCConfiguration,
  RCConfigurationModel,
  RetrievedRCConfiguration
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { NewRCConfigurationPublic } from "../generated/definitions/NewRCConfigurationPublic";
import { aCosmosResourceMetadata } from "./models.mock";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";

const aPublicDetailAuthentication = {
  header_key_name: "a" as NonEmptyString,
  key: "key" as NonEmptyString,
  type: "type" as NonEmptyString
};

const aDetailAuthentication = {
  headerKeyName: "a" as NonEmptyString,
  key: "key" as NonEmptyString,
  type: "type" as NonEmptyString
};

export const aUserId = "aUserId" as NonEmptyString;

export const aRemoteContentConfiguration: RCConfiguration = {
  hasPrecondition: HasPreconditionEnum.ALWAYS,
  disableLollipopFor: [],
  isLollipopEnabled: false,
  configurationId: "01HQRD0YCVDXF1XDW634N87XCG" as Ulid,
  userId: aUserId,
  name: "aRemoteContentConfiguration" as NonEmptyString,
  description: "a description" as NonEmptyString,
  prodEnvironment: {
    baseUrl: "aValidUrl" as NonEmptyString,
    detailsAuthentication: aDetailAuthentication
  }
};

export const aRetrievedRemoteContentConfiguration: RetrievedRCConfiguration = {
  ...aRemoteContentConfiguration,
  ...aCosmosResourceMetadata,
  id: `${aRemoteContentConfiguration.configurationId}-00000001` as NonEmptyString,
  version: 1 as NonNegativeInteger
};

export const aPublicRemoteContentConfiguration: NewRCConfigurationPublic = {
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

export const createNewConfigurationMock = jest.fn();
export const upsertConfigurationMock = jest.fn();
export const findLastVersionMock = jest.fn();

export const rccModelMock = ({
  create: createNewConfigurationMock,
  upsert: upsertConfigurationMock,
  findLastVersionByModelId: findLastVersionMock
} as unknown) as RCConfigurationModel;
