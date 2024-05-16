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
  aNewRemoteContentConfiguration,
  aRemoteContentConfiguration
} from "../__mocks__/mock.remote_content";

const baseUrl = "http://function:7071";

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

describe("UpdateRCConfiguration", () => {
  test("should return a 400 error if the payload is not valid", async () => {
    const aFetch = getNodeFetch({});
    const body = {};
    const r = await putCreateRCConfiguration(aFetch)(
      body,
      aRemoteContentConfiguration.configurationId,
      aRemoteContentConfiguration.userId
    );
    const jsonResponse = await r.json();

    expect(r.status).toBe(400);
    expect(jsonResponse.title).toBe("Invalid NewRCConfigurationPublic");
  });

  test("should return a 400 error if the payload is valid but the configurationId is not", async () => {
    const aFetch = getNodeFetch({});
    const body = aNewRemoteContentConfiguration;
    const r = await putCreateRCConfiguration(aFetch)(
      body,
      "invalidUlid",
      aRemoteContentConfiguration.userId
    );
    const jsonResponse = await r.json();

    expect(r.status).toBe(400);
    expect(jsonResponse.title).toBe(
      'Invalid string that matches the pattern "^[0-9a-hjkmnp-tv-zA-HJKMNP-TV-Z]{26}$"'
    );
  });

  test("should return a 403 error if the header x-user-id is not defined", async () => {
    const aFetch = getNodeFetch({});
    const body = aNewRemoteContentConfiguration;
    const r = await putCreateRCConfiguration(aFetch)(
      body,
      aRemoteContentConfiguration.configurationId
    );
    const jsonResponse = await r.json();

    expect(r.status).toBe(403);
    expect(jsonResponse.title).toBe("Anonymous user");
  });

  test("should return a 403 error if the header x-user-id is defined but is not equal to the one in the configuration", async () => {
    const aFetch = getNodeFetch({});
    const body = aNewRemoteContentConfiguration;
    const r = await putCreateRCConfiguration(aFetch)(
      body,
      aRemoteContentConfiguration.configurationId,
      "invalidUserId"
    );
    const jsonResponse = await r.json();

    expect(r.status).toBe(403);
    expect(jsonResponse.title).toBe("You are not allowed here");
  });

  test("should return a 404 error if the payload and the configurationId are valid but the configuration does not exist", async () => {
    const aFetch = getNodeFetch({});
    const body = aNewRemoteContentConfiguration;
    const nonExistingConfigurationId = "01HNX1RP85JYV9K96XK7GATWD1";
    const r = await putCreateRCConfiguration(aFetch)(
      body,
      nonExistingConfigurationId,
      aRemoteContentConfiguration.userId
    );
    const jsonResponse = await r.json();

    expect(r.status).toBe(404);
    expect(jsonResponse.title).toBe("Configuration not found");
    expect(jsonResponse.detail).toBe(
      `Cannot find any remote-content configuration`
    );
  });

  test("should return a 204 no content if the request is ok and the configuration is correctly updated", async () => {
    const aFetch = getNodeFetch({});
    const body = aNewRemoteContentConfiguration;
    const r = await putCreateRCConfiguration(aFetch)(
      body,
      aRemoteContentConfiguration.configurationId,
      aRemoteContentConfiguration.userId
    );

    expect(r.status).toBe(204);
    // TODO: we can use the GetRCConfiguration to verify that the records were updated correctly once it is implemented
  });
});

const putCreateRCConfiguration = (nodeFetch: typeof fetch) => async (
  body: unknown,
  configurationId: unknown,
  userId?: string
) => {
  const baseHeaders = {
    "Content-Type": "application/json"
  };
  const headers = userId
    ? {
        ...baseHeaders,
        "x-user-id": userId,
        "x-user-groups": "ApiRemoteContentConfigurationWrite",
        "x-subscription-id": "MANAGE-aSubscriptionId"
      }
    : baseHeaders;
  return await nodeFetch(
    `${baseUrl}/api/v1/remote-contents/configurations/${configurationId}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(body)
    }
  );
};
