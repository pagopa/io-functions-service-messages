import * as express from "express";
import * as winston from "winston";
import nodeFetch from "node-fetch";

import { createBlobService } from "azure-storage";
import { AzureFunction, Context } from "@azure/functions";
import { QueueClient } from "@azure/storage-queue";

import { pipe } from "fp-ts/lib/function";

import { Millisecond } from "@pagopa/ts-commons/lib/units";
import {
  AbortableFetch,
  setFetchTimeout,
  toFetch
} from "@pagopa/ts-commons/lib/fetch";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { withAppInsightsContext } from "@pagopa/io-functions-commons/dist/src/utils/application_insights";
import { AzureContextTransport } from "@pagopa/io-functions-commons/dist/src/utils/logging";
import {
  MessageModel,
  MESSAGE_COLLECTION_NAME
} from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  ServiceModel,
  SERVICE_COLLECTION_NAME
} from "@pagopa/io-functions-commons/dist/src/models/service";
import {
  ProfileModel,
  PROFILE_COLLECTION_NAME
} from "@pagopa/io-functions-commons/dist/src/models/profile";

import { createClient } from "@pagopa/io-backend-session-sdk/client";
import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";
import { cosmosdbInstance } from "../utils/cosmosdb";

import { Notify } from "./handler";
import { sendNotification } from "./notification";
import {
  getMessageWithContent,
  getService,
  getUserProfileReader,
  getUserSessionStatusReader
} from "./readers";

const DEFAULT_REQUEST_TIMEOUT_MS = 10000 as Millisecond;

// Generic HTTP/HTTPS fetch with optional keepalive agent
// @see https://github.com/pagopa/io-ts-commons/blob/master/src/agent.ts#L10
const httpOrHttpsApiFetch = pipe(
  AbortableFetch((nodeFetch as unknown) as typeof fetch),
  abortableFetch => setFetchTimeout(DEFAULT_REQUEST_TIMEOUT_MS, abortableFetch),
  fetchWithTimeout => toFetch(fetchWithTimeout)
);

// Get config
const config = getConfigOrThrow();

// eslint-disable-next-line functional/no-let
let logger: Context["log"] | undefined;
const contextTransport = new AzureContextTransport(() => logger, {
  level: "debug"
});
winston.add(contextTransport);

// Setup Express
const app = express();
secureExpressApp(app);

const telemetryClient = initTelemetryClient();

// Models
const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  config.MESSAGE_CONTAINER_NAME
);

const blobService = createBlobService(
  config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING
);

const serviceModel = new ServiceModel(
  cosmosdbInstance.container(SERVICE_COLLECTION_NAME)
);

const profileModel = new ProfileModel(
  cosmosdbInstance.container(PROFILE_COLLECTION_NAME)
);

const sessionClient = createClient<"token">({
  baseUrl: config.BACKEND_BASE_URL,
  fetchApi: httpOrHttpsApiFetch,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  withDefaults: op => params => op({ ...params, token: config.BACKEND_TOKEN })
});

// Add express route
app.post(
  "/api/v1/notify",
  Notify(
    getUserProfileReader(profileModel),
    getUserSessionStatusReader(sessionClient),
    getMessageWithContent(messageModel, blobService),
    getService(serviceModel),
    sendNotification(
      new QueueClient(
        config.NOTIFICATION_QUEUE_STORAGE_CONNECTION_STRING,
        config.NOTIFICATION_QUEUE_NAME
      )
    ),
    telemetryClient
  )
);

const azureFunctionHandler = createAzureFunctionHandler(app);

const httpStart: AzureFunction = (context: Context): void => {
  logger = context.log;

  setAppContext(app, context);
  withAppInsightsContext(context, () => azureFunctionHandler(context));
};

export default httpStart;
