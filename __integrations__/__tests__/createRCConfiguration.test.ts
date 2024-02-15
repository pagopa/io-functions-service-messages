import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";

import { CosmosClient, CosmosClientOptions, Database } from "@azure/cosmos";
import { pipe } from "fp-ts/lib/function";
import { getNodeFetch } from "../utils/fetch";
import {
  REMOTE_CONTENT_COSMOSDB_KEY,
  REMOTE_CONTENT_COSMOSDB_NAME,
  REMOTE_CONTENT_COSMOSDB_URI
} from "../env";
import {
  createRCCosmosDbAndCollections,
  fillRCConfiguration
} from "../__mocks__/fixtures";
import { RCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { HasPreconditionEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/HasPrecondition";
import { NewRCConfigurationPublic } from "@pagopa/io-functions-commons/dist/generated/definitions/NewRCConfigurationPublic";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";

const baseUrl = "http://function:7071";

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
    detailsAuthentication: aDetailAuthentication
  }
};

export const aRemoteContentConfigurationList = [aRemoteContentConfiguration];

const cosmosClient = new CosmosClient({
  endpoint: REMOTE_CONTENT_COSMOSDB_URI,
  key: REMOTE_CONTENT_COSMOSDB_KEY
} as CosmosClientOptions);

// eslint-disable-next-line functional/no-let
let database: Database;

beforeAll(async () => {
  database = await pipe(
    createRCCosmosDbAndCollections(cosmosClient, REMOTE_CONTENT_COSMOSDB_NAME),
    TE.getOrElse(() => {
      throw Error("Cannot create db");
    })
  )();
  await fillRCConfiguration(database, aRemoteContentConfigurationList);
});

describe("CreateRCConfiguration", () => {
  test("should return a 400 error if the payload is not valid", async () => {
    const aFetch = getNodeFetch({});
    const body = {};
    const r = await postCreateRCConfiguration(aFetch)(
      body,
      aRemoteContentConfiguration.userId
    );
    const jsonResponse = await r.json();

    expect(r.status).toBe(400);
    expect(jsonResponse.title).toBe("Invalid NewRCConfigurationPublic");
  });

  test("should return a 403 error if the x-user-id header is not defined", async () => {
    const aFetch = getNodeFetch({});
    const body = aNewRemoteContentConfiguration;
    const r = await postCreateRCConfiguration(aFetch)(body);
    const jsonResponse = await r.json();

    expect(r.status).toBe(403);
    expect(jsonResponse.title).toBe("Anonymous user");
  });

  test("should return a 201 if the payload is valid", async () => {
    const aFetch = getNodeFetch({});
    const body = aNewRemoteContentConfiguration;
    const r = await postCreateRCConfiguration(aFetch)(
      body,
      aRemoteContentConfiguration.userId
    );
    const jsonResponse = await r.json();

    expect(r.status).toBe(201);
    expect(E.isRight(Ulid.decode(jsonResponse.configuration_id))).toBeTruthy();
  });
});

const postCreateRCConfiguration = (nodeFetch: typeof fetch) => async (
  body: unknown,
  userId?: string
) => {
  const baseHeaders = {
    "Content-Type": "application/json"
  };
  const headers = userId
    ? { ...baseHeaders, "x-user-id": userId }
    : baseHeaders;
  return await nodeFetch(`${baseUrl}/api/v1/remote-contents/configurations`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
};
