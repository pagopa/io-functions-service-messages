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
import { RCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { HasPreconditionEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/HasPrecondition";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";

// FIX: move this to a util file
const baseUrl = "http://function:7071";

const aDetailAuthentication = {
  headerKeyName: "a" as NonEmptyString,
  key: "key" as NonEmptyString,
  type: "type" as NonEmptyString
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
  test("should go fine", async () => {
    const aFetch = getNodeFetch({});
    const body = {};
    const r = await postCreateRCConfiguration(aFetch)(body);
    const jsonResponse = await r.json();
    console.log(r.status);
    console.log(jsonResponse);
  });
});

const postCreateRCConfiguration = (nodeFetch: typeof fetch) => async (
  body: unknown
) => {
  return await nodeFetch(`${baseUrl}/api/v1/remote-contents/configurations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
};
