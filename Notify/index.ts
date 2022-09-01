import * as express from "express";
import { AzureFunction, Context } from "@azure/functions";

import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { withAppInsightsContext } from "@pagopa/io-functions-commons/dist/src/utils/application_insights";

import { initTelemetryClient } from "../utils/appinsights";

import { Notify } from "./handler";

// Setup Express
const app = express();
secureExpressApp(app);

const telemetryClient = initTelemetryClient();

// Add express route
app.post("/api/v1/notify", Notify(telemetryClient));

const azureFunctionHandler = createAzureFunctionHandler(app);

const httpStart: AzureFunction = (context: Context): void => {
  setAppContext(app, context);
  withAppInsightsContext(context, () => azureFunctionHandler(context));
};

export default httpStart;
