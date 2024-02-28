import * as t from "io-ts";

import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { Context } from "@azure/functions";

import { RetrievedRCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import {
  UserRCConfiguration,
  UserRCConfigurationModel,
  RetrievedUserRCConfiguration
} from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { ILogger, createLogger } from "../../utils/logger";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { aRetrievedRemoteContentConfiguration } from "../../__mocks__/remote-content";
import { aCosmosResourceMetadata } from "../../__mocks__/models.mock";

import { handler } from "../handler";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { CosmosErrors } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";

const logger = ({
  error: jest.fn()
} as unknown) as ILogger;

const aRetrievedUserRCConfiguration: RetrievedUserRCConfiguration = {
  id: (aRetrievedRemoteContentConfiguration.configurationId as unknown) as NonEmptyString,
  userId: aRetrievedRemoteContentConfiguration.userId,
  ...aCosmosResourceMetadata
};

const mockUpsert = jest
  .fn()
  .mockReturnValue(TE.right(aRetrievedUserRCConfiguration));

const mockUserRCConfigurationModel = ({
  upsert: mockUpsert
} as any) as UserRCConfigurationModel;

const defaultStartTime = 0 as NonNegativeInteger;

const handlerMock = handler(
  mockUserRCConfigurationModel,
  logger,
  defaultStartTime
);

// ----------------------
// Tests
// ----------------------

describe("CosmosRemoteContentMessageConfigurationChangeFeed", () => {
  beforeEach(() => jest.clearAllMocks());

  it("SHOULD upsert a new UserRCConfiguration GIVEN a new RemoteContentConfiguration", async () => {
    const res = await handlerMock([aRetrievedRemoteContentConfiguration]);
    expect(mockUserRCConfigurationModel.upsert).toBeCalledTimes(1);
    expect(res).toEqual([aRetrievedUserRCConfiguration]);
  });

  it("SHOULD upsert more new UserRCConfiguration GIVEN more than 1 new RemoteContentConfiguration", async () => {
    const res = await handlerMock([
      aRetrievedRemoteContentConfiguration,
      aRetrievedRemoteContentConfiguration
    ]);
    expect(mockUserRCConfigurationModel.upsert).toBeCalledTimes(2);
    expect(res).toEqual([
      aRetrievedUserRCConfiguration,
      aRetrievedUserRCConfiguration
    ]);
  });

  it("SHOULD return empty array GIVEN an invalid RemoteContentConfiguration", async () => {
    const res = await handlerMock([
      {
        ...aRetrievedRemoteContentConfiguration,
        configurationId: "notanulid" as Ulid
      }
    ]);
    expect(mockUserRCConfigurationModel.upsert).not.toBeCalled();
    expect(res).toEqual([]);
  });

  it("SHOULD return empty array GIVEN a RemoteContentConfiguration with _ts before defaultStartTime", async () => {
    const res = await handlerMock([
      { ...aRetrievedRemoteContentConfiguration, _ts: -1 }
    ]);
    expect(mockUserRCConfigurationModel.upsert).not.toBeCalled();
    expect(res).toEqual([]);
  });

  it("SHOULD return an Error WHEN mockUserRCConfigurationModel.upsert return an Error", async () => {
    mockUpsert.mockReturnValue(
      TE.left(({ kind: "COSMOS_ERROR" } as unknown) as CosmosErrors)
    );
    const res = await handlerMock([
      { ...aRetrievedRemoteContentConfiguration }
    ]);
    expect(mockUserRCConfigurationModel.upsert).toBeCalledTimes(1);
    expect(logger.error).toBeCalledTimes(1);
    expect(res).toEqual(
      new Error(
        "COSMOS_ERROR | Cannot upsert the new UserRCConfiguration for configuration 01HQRD0YCVDXF1XDW634N87XCG"
      )
    );
  });
});
