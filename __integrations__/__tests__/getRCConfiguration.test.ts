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
import { aRemoteContentConfiguration } from "../__mocks__/mock.remote_content";

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

describe("GetRCConfiguration", () => {
  test("should return 404 if no configuration is found", async () => {
    const nonExistingConfigurationId = "01HQND1DH4EPPSAPNR3SNFAXWE";
    const aFetch = getNodeFetch({});
    const r = await getRCConfiguration(aFetch)(nonExistingConfigurationId);

    const response = await r.text();
    console.log(response);
    expect(r.status).toBe(404);

    // expect(jsonResponse.title).toBe("Configuration not found");
    // expect(jsonResponse.detail).toBe(
    //   `Cannot find any configuration with configurationId: ${nonExistingConfigurationId}`
    // );
  });
});

const getRCConfiguration = (nodeFetch: typeof fetch) => async (
  configurationId: unknown
) =>
  await nodeFetch(
    `${baseUrl}/api/v1/remote-contents/configurations/${configurationId}`,
    {
      method: "GET"
    }
  );
