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
import { Ulid } from "@pagopa/ts-commons/lib/strings";
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
