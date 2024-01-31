import { CosmosClient, CosmosClientOptions, Database } from "@azure/cosmos";
import { QueueServiceClient } from "@azure/storage-queue";
import { createBlobService } from "azure-storage";

import * as E from "fp-ts/Either";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import { pipe } from "fp-ts/lib/function";

import { NotificationInfo } from "../generated/definitions/NotificationInfo";
import { NotificationTypeEnum } from "../generated/definitions/NotificationType";

import {
  WAIT_MS,
  SHOW_LOGS,
  QueueStorageConnection,
  COSMOSDB_URI,
  COSMOSDB_KEY,
  COSMOSDB_NAME,
  MESSAGE_CONTAINER_NAME,
  BACKEND_PORT,
  NOTIFICATION_QUEUE_NAME
} from "../env";
import { getNodeFetch } from "../utils/fetch";
import {
  createCosmosDbAndCollections,
  fillMessages,
  fillMessagesStatus,
  fillMessagesView,
  fillProfiles,
  fillServices
} from "../__mocks__/fixtures";
import { createBlobs, createQueues } from "../__mocks__/utils/azure_storage";
import { messagesList, messageStatusList } from "../__mocks__/mock.messages";
import { serviceList } from "../__mocks__/mock.services";
import { closeServer, startServer } from "../__mocks__/server/io-backend.mock";
import { Server, ServerResponse } from "http";
import {
  anAutoFiscalCodeWithReminderDisabled,
  anAutoFiscalCodeWithReminderNotDefined,
  profiles
} from "../__mocks__/mock.profiles";

console.log("ENV: ", WAIT_MS, SHOW_LOGS, BACKEND_PORT);

const MAX_ATTEMPT = 50;
jest.setTimeout(WAIT_MS * MAX_ATTEMPT);

// FIX: move this to a util file
const baseUrl = "http://function:7071";

const customHeaders = {
  "x-user-groups": "ApiReminderNotify"
};

// ----------------
// Setup dbs
// ----------------

const blobService = createBlobService(QueueStorageConnection);
const queueServiceClient = QueueServiceClient.fromConnectionString(
  QueueStorageConnection
);

const cosmosClient = new CosmosClient({
  endpoint: COSMOSDB_URI,
  key: COSMOSDB_KEY
} as CosmosClientOptions);

// eslint-disable-next-line functional/no-let
let database: Database;

let ioBackendServer: Server;
const mockGetUserSession = jest.fn();
mockGetUserSession.mockImplementation((response: ServerResponse) => {
  sendUserSession(response, true);
});

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
    TE.chainW(_ =>
      pipe(
        createQueues(queueServiceClient, [NOTIFICATION_QUEUE_NAME]),
        T.map(resQ => [RA.rights(resQ), RA.lefts(resQ)]),
        T.map(([_, leftsQ]) =>
          leftsQ.length > 0
            ? E.left(`Error creating ${leftsQ.length} queues`)
            : E.right(void 0)
        )
      )
    ),
    TE.getOrElse(() => {
      throw Error("Cannot create azure storage");
    })
  )();

  await fillMessages(database, blobService, messagesList);
  await fillMessagesStatus(database, messageStatusList);
  await fillMessagesView(database, messagesList, messageStatusList);
  await fillServices(database, serviceList);
  await fillProfiles(database, profiles);

  // Setup mock io-backend server
  ioBackendServer = await startServer(BACKEND_PORT, mockGetUserSession);
});

beforeEach(async () => {
  jest.clearAllMocks();
  await queueServiceClient
    .getQueueClient(NOTIFICATION_QUEUE_NAME)
    .clearMessages();
});

afterAll(async () => await closeServer(ioBackendServer));

const aValidNotificationRequest: NotificationInfo = {
  fiscal_code: messagesList[0].fiscalCode,
  message_id: messagesList[0].id,
  notification_type: NotificationTypeEnum.REMINDER_READ
};

describe("Notify |> Middleware errors", () => {
  it("should return 400 when payload is not defined", async () => {
    const nodeFetch = getNodeFetch(customHeaders, SHOW_LOGS);

    const body = {};
    const response = await postNotify(nodeFetch)(body);

    expect(response.status).toEqual(400);
  });

  it("should return 403 when user ha no proper user groups", async () => {
    const nodeFetch = getNodeFetch({}, SHOW_LOGS);

    const response = await postNotify(nodeFetch)(aValidNotificationRequest);

    expect(response.status).toEqual(403);
  });
});

describe("Notify |> Success", () => {
  it("should send verbose notification if user enabled reminder notification and has an active session", async () => {
    const nodeFetch = getNodeFetch(customHeaders, SHOW_LOGS);

    const response = await postNotify(nodeFetch)(aValidNotificationRequest);

    const pushSent = await queueServiceClient
      .getQueueClient(NOTIFICATION_QUEUE_NAME)
      .receiveMessages();

    expect(mockGetUserSession).toHaveBeenCalledTimes(1);
    expect(response.status).toEqual(204);

    expect(pushSent.receivedMessageItems.length).toBe(1);

    const message = base64ToJSON(pushSent.receivedMessageItems[0].messageText);
    expect(message).toEqual(
      expect.objectContaining({
        kind: "Notify",
        payload: {
          message_id: messagesList[0].id,
          title: expect.stringContaining("Leggi il messaggio da "),
          message: messagesList[0].content.subject
        }
      })
    );
  });

  it("should send anonymous notification if user enabled reminder notification but has no active session", async () => {
    mockGetUserSession.mockImplementationOnce((response: ServerResponse) => {
      sendUserSession(response, false);
    });

    const nodeFetch = getNodeFetch(customHeaders, SHOW_LOGS);

    const response = await postNotify(nodeFetch)(aValidNotificationRequest);

    const pushSent = await queueServiceClient
      .getQueueClient(NOTIFICATION_QUEUE_NAME)
      .receiveMessages();

    expect(mockGetUserSession).toHaveBeenCalledTimes(1);
    expect(response.status).toEqual(204);

    expect(pushSent.receivedMessageItems.length).toBe(1);

    const message = base64ToJSON(pushSent.receivedMessageItems[0].messageText);
    expect(message).toEqual(
      expect.objectContaining({
        kind: "Notify",
        payload: {
          message_id: messagesList[0].id,
          title: "Hai un messaggio non letto",
          message: "Entra nell'app per leggerlo"
        }
      })
    );
  });
});

describe("Notify |> Errors", () => {
  it("should not send notification if user disabled reminder notifications", async () => {
    const nodeFetch = getNodeFetch(customHeaders, SHOW_LOGS);

    const response = await postNotify(nodeFetch)({
      ...aValidNotificationRequest,
      fiscal_code: anAutoFiscalCodeWithReminderDisabled
    });

    expect(response.status).toEqual(403);
    expect(mockGetUserSession).toHaveBeenCalledTimes(0);
  });

  it("should not send notification if user did not make a choice about reminder notifications", async () => {
    const nodeFetch = getNodeFetch(
      {
        "x-user-groups": "ApiReminderNotify"
      },
      SHOW_LOGS
    );

    const response = await postNotify(nodeFetch)({
      ...aValidNotificationRequest,
      fiscal_code: anAutoFiscalCodeWithReminderNotDefined
    });

    expect(response.status).toEqual(403);
    expect(mockGetUserSession).toHaveBeenCalledTimes(0);
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
    body: JSON.stringify(body)
  });
};

function sendUserSession(response: ServerResponse, active: boolean) {
  const userSessionInfo = { active };
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(userSessionInfo));
}

function base64ToJSON(text: string) {
  return JSON.parse(Buffer.from(text, "base64").toString("utf8"));
}
