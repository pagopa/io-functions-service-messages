import * as TE from "fp-ts/lib/TaskEither";

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
import {
  aPublicRemoteContentConfiguration,
  aRemoteContentConfiguration
} from "../__mocks__/mock.remote_content";

const baseUrl = "http://function:7071";

export const aRemoteContentConfigurationList = [aRemoteContentConfiguration];

const internalUserId = "internal";

const cosmosClient = new CosmosClient({
  endpoint: REMOTE_CONTENT_COSMOSDB_URI,
  key: REMOTE_CONTENT_COSMOSDB_KEY
} as CosmosClientOptions);
const nonExistingConfigurationId = "01HQND1DH4EPPSAPNR3SNFAXWE";

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

describe("GetRCConfiguration", () => {
  test("should return 400 if the configurationId is not a valid Ulid", async () => {
    const aFetch = getNodeFetch({});
    const r = await getRCConfiguration(aFetch)(
      "invalidConfigId",
      aRemoteContentConfiguration.userId
    );

    const response = await r.json();

    expect(r.status).toBe(400);
    expect(response.title).toContain("Invalid string that matches the pattern");
  });

  test("should return 403 if the configurationId is a valid Ulid but the userId is not provided in header", async () => {
    const aFetch = getNodeFetch({});
    const r = await getRCConfiguration(aFetch)(nonExistingConfigurationId);

    const response = await r.json();

    expect(r.status).toBe(403);
    expect(response.title).toContain("Anonymous user");
    expect(response.detail).toContain(
      "The request could not be associated to a user, missing userId or subscriptionId."
    );
  });

  test("should return 404 if no configuration is found", async () => {
    const aFetch = getNodeFetch({});
    const r = await getRCConfiguration(aFetch)(
      nonExistingConfigurationId,
      aRemoteContentConfiguration.userId
    );

    const response = await r.json();
    expect(r.status).toBe(404);

    expect(response.title).toBe("Configuration not found");
    expect(response.detail).toBe(
      `Cannot find any configuration with configurationId: ${nonExistingConfigurationId}`
    );
  });

  test("should return 403 if the userId in header is not the same in configuration", async () => {
    const aFetch = getNodeFetch({});
    const r = await getRCConfiguration(aFetch)(
      aRemoteContentConfiguration.configurationId,
      "aDifferentUserId"
    );

    expect(r.status).toBe(403);
  });

  test("should return 200 if the request match an existing configuration", async () => {
    const aFetch = getNodeFetch({});
    const r = await getRCConfiguration(aFetch)(
      aRemoteContentConfiguration.configurationId,
      aRemoteContentConfiguration.userId
    );

    const response = await r.json();

    expect(r.status).toBe(200);
    expect(response).toMatchObject(aPublicRemoteContentConfiguration);
  });

  test("should return 200 if the userId does not match the one in the configuration but is internal", async () => {
    const aFetch = getNodeFetch({});
    const r = await getRCConfiguration(aFetch)(
      aRemoteContentConfiguration.configurationId,
      internalUserId
    );

    const response = await r.json();

    expect(r.status).toBe(200);
    expect(response).toMatchObject(aPublicRemoteContentConfiguration);
  });
});

const getRCConfiguration = (nodeFetch: typeof fetch) => async (
  configurationId: unknown,
  userId?: string
) => {
  const baseHeaders = {
    "Content-Type": "application/json"
  };
  const headers = userId
    ? { ...baseHeaders, "x-user-id": userId }
    : baseHeaders;
  return await nodeFetch(
    `${baseUrl}/api/v1/remote-contents/configurations/${configurationId}`,
    {
      method: "GET",
      headers
    }
  );
};
