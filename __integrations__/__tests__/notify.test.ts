import { CosmosClient, CosmosClientOptions, Database } from "@azure/cosmos";
import { createBlobService } from "azure-storage";

import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";

import {
  WAIT_MS,
  SHOW_LOGS,
  QueueStorageConnection,
  COSMOSDB_URI,
  COSMOSDB_KEY,
  COSMOSDB_NAME,
  MESSAGE_CONTAINER_NAME
} from "../env";
import { getNodeFetch } from "../utils/fetch";
import { waitFunctionToSetup } from "../utils/tasks";
import {
  createCosmosDbAndCollections,
  fillMessages,
  fillMessagesStatus,
  fillMessagesView,
  fillServices
} from "../__mocks__/fixtures";
import { createBlobs } from "../__mocks__/utils/azure_storage";
import { messagesList, messageStatusList } from "../__mocks__/mock.messages";
import { serviceList } from "../__mocks__/mock.services";

console.log("ENV: ", WAIT_MS, SHOW_LOGS);

const MAX_ATTEMPT = 50;
jest.setTimeout(WAIT_MS * MAX_ATTEMPT);

const baseUrl = "http://function:7071";

const customHeaders = {};

// ----------------
// Setup dbs
// ----------------

const blobService = createBlobService(QueueStorageConnection);

const cosmosClient = new CosmosClient({
  endpoint: COSMOSDB_URI,
  key: COSMOSDB_KEY
} as CosmosClientOptions);

// eslint-disable-next-line functional/no-let
let database: Database;

// Wait some time
beforeAll(async () => {
  database = await pipe(
    createCosmosDbAndCollections(cosmosClient, COSMOSDB_NAME),
    TE.getOrElse(e => {
      throw Error("Cannot create db");
    })
  )();

  await pipe(
    createBlobs(blobService, [MESSAGE_CONTAINER_NAME]),
    TE.getOrElse(() => {
      throw Error("Cannot create azure storage");
    })
  )();

  await fillMessages(database, blobService, messagesList);
  await fillMessagesStatus(database, messageStatusList);
  await fillMessagesView(database, messagesList, messageStatusList);
  await fillServices(database, serviceList);

  await waitFunctionToSetup(
    MAX_ATTEMPT / 2,
    WAIT_MS,
    `${baseUrl}/api/ready`,
    getNodeFetch()
  );
});

beforeEach(() => jest.clearAllMocks());

describe("Notify |> Middleware errors", () => {
  it("should return 400 when payload is not defined", async () => {
    const nodeFetch = getNodeFetch({}, SHOW_LOGS);

    const body = {};
    const response = await postNotify(nodeFetch)(body);

    expect(response.status).toEqual(400);
  });
});

// -----------
// Utils
// -----------

const postNotify = (nodeFetch: typeof fetch) => async body => {
  return await nodeFetch(`${baseUrl}/api/v1/notify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body.message)
  });
};
