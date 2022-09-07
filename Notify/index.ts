import * as express from "express";

import { createBlobService } from "azure-storage";
import { AzureFunction, Context } from "@azure/functions";
import { QueueClient } from "@azure/storage-queue";

import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { withAppInsightsContext } from "@pagopa/io-functions-commons/dist/src/utils/application_insights";
import {
  MessageModel,
  MESSAGE_COLLECTION_NAME
} from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  ServiceModel,
  SERVICE_COLLECTION_NAME
} from "@pagopa/io-functions-commons/dist/src/models/service";

import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";
import { cosmosdbInstance } from "../utils/cosmosdb";
import { createClient } from "../generated/session/client";

import { Notify } from "./handler";
import { sendNotification } from "./notification";
import {
  getMessageWithContent,
  getService,
  getUserSessionStatusReader
} from "./readers";

// Get config
const config = getConfigOrThrow();

// Setup Express
const app = express();
secureExpressApp(app);

const telemetryClient = initTelemetryClient();

// Models
const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  config.MESSAGE_CONTAINER_NAME
);

const blobService = createBlobService(config.QueueStorageConnection);

const serviceModel = new ServiceModel(
  cosmosdbInstance.container(SERVICE_COLLECTION_NAME)
);

const sessionClient = createClient<"token">({
  baseUrl: config.BACKEND_BASE_URL,
  fetchApi: fetch,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  withDefaults: op => params => op({ ...params, token: config.BACKEND_TOKEN })
});

// Add express route
app.post(
  "/api/v1/notify",
  Notify(
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
  setAppContext(app, context);
  withAppInsightsContext(context, () => azureFunctionHandler(context));
};

export default httpStart;
