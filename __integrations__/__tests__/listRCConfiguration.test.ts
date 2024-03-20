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
  fillRCConfiguration,
  fillUserRCConfiguration
} from "../__mocks__/fixtures";
import {
  aPublicRemoteContentConfiguration,
  aRemoteContentConfiguration,
  anotherPublicRemoteContentConfiguration,
  anotherRemoteContentConfiguration
} from "../__mocks__/mock.remote_content";
import { UserRCConfiguration }from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

const baseUrl = "http://function:7071";

export const aRemoteContentConfigurationList = [aRemoteContentConfiguration, anotherRemoteContentConfiguration];

const cosmosClient = new CosmosClient({
  endpoint: REMOTE_CONTENT_COSMOSDB_URI,
  key: REMOTE_CONTENT_COSMOSDB_KEY
} as CosmosClientOptions);
const noConfigurationUserId = "noConfigurationUserId";

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
  const userRCConfigurations = aRemoteContentConfigurationList.map(config => {
    return {userId: config.userId, id: config.configurationId as unknown as NonEmptyString } as UserRCConfiguration
  }) as ReadonlyArray<UserRCConfiguration>
  await fillUserRCConfiguration(database, userRCConfigurations);
});

describe("ListRCConfiguration", () => {
  test("should return 403 if the userId is not provided in header", async () => {
    const aFetch = getNodeFetch({});
    const r = await listRCConfiguration(aFetch)();

    const response = await r.json();

    expect(r.status).toBe(403);
    expect(response.title).toContain("Anonymous user");
    expect(response.detail).toContain(
      "The request could not be associated to a user, missing userId or subscriptionId."
    );
  });

  test("should return 200 with an empty response if there are no configurations associated to requested userId", async () => {
    const aFetch = getNodeFetch({});
    const r = await listRCConfiguration(aFetch)(noConfigurationUserId);

    const response = await r.json();

    expect(r.status).toBe(200);
    expect(response).toMatchObject({});
  });

  test("should return 200 with the user configurations", async () => {
    const aFetch = getNodeFetch({});
    const r = await listRCConfiguration(aFetch)(
      aRemoteContentConfiguration.userId
    );

    const response = await r.json();

    expect(r.status).toBe(200);
    expect(response).toMatchObject({
      rcConfigList: [anotherPublicRemoteContentConfiguration, aPublicRemoteContentConfiguration]
    });
  });
});

const listRCConfiguration = (nodeFetch: typeof fetch) => async (
  userId?: string
) => {
  const baseHeaders = {
    "Content-Type": "application/json"
  };
  const headers = userId
    ? { ...baseHeaders, "x-user-id": userId }
    : baseHeaders;
  return await nodeFetch(
    `${baseUrl}/api/v1/remote-contents/configurations`,
    {
      method: "GET",
      headers
    }
  );
};

