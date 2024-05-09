import * as express from "express";

import { AzureFunction, Context } from "@azure/functions";
import { ulidGeneratorAsUlid } from "@pagopa/io-functions-commons/dist/src/utils/strings";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { withAppInsightsContext } from "@pagopa/io-functions-commons/dist/src/utils/application_insights";
import {
  RCConfigurationModel,
  RC_CONFIGURATION_COLLECTION_NAME
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration_non_versioned_temp";
import { remoteContentCosmosDbInstance } from "../utils/cosmosdb";
import { getCreateRCConfigurationExpressHandler } from "./handler";

const rccModel = new RCConfigurationModel(
  remoteContentCosmosDbInstance.container(RC_CONFIGURATION_COLLECTION_NAME)
);

// Setup Express
const app = express();
secureExpressApp(app);

// Add express route
app.post(
  "/api/v1/remote-contents/configurations",
  getCreateRCConfigurationExpressHandler({
    generateConfigurationId: ulidGeneratorAsUlid,
    rccModel
  })
);

const azureFunctionHandler = createAzureFunctionHandler(app);

const httpStart: AzureFunction = (context: Context): void => {
  setAppContext(app, context);
  withAppInsightsContext(context, () => azureFunctionHandler(context));
};

export default httpStart;
