import * as express from "express";

import { AzureFunction, Context } from "@azure/functions";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { withAppInsightsContext } from "@pagopa/io-functions-commons/dist/src/utils/application_insights";
import {
  RCConfigurationModel,
  RC_CONFIGURATION_COLLECTION_NAME
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { remoteContentCosmosDbInstance } from "../utils/cosmosdb";
import { getUpdateRCConfigurationExpressHandler } from "./handler";
import { getConfigOrThrow } from "../utils/config";
import { RedisClientFactory } from "../utils/redis";

const rccModel = new RCConfigurationModel(
  remoteContentCosmosDbInstance.container(RC_CONFIGURATION_COLLECTION_NAME)
);

const config = getConfigOrThrow();

const redisClientFactory = new RedisClientFactory(config);

// Setup Express
const app = express();
secureExpressApp(app);

// Add express route
app.put(
  "/api/v1/remote-contents/configurations/:configurationId",
  getUpdateRCConfigurationExpressHandler({
    rccModel,
    redisClientFactory,
    config
  })
);

const azureFunctionHandler = createAzureFunctionHandler(app);

const httpStart: AzureFunction = (context: Context): void => {
  setAppContext(app, context);
  withAppInsightsContext(context, () => azureFunctionHandler(context));
};

export default httpStart;
