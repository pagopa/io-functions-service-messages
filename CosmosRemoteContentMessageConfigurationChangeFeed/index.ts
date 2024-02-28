import { Context } from "@azure/functions";

import { getConfigOrThrow } from "../utils/config";
import { handler } from "./handler";
import { remoteContentCosmosDbInstance } from "../utils/cosmosdb";
import {
  UserRCConfigurationModel,
  USER_RC_CONFIGURATIONS_COLLECTION_NAME
} from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { AzureContextTransport } from "@pagopa/io-functions-commons/dist/src/utils/logging";
import * as winston from "winston";
import { initTelemetryClient } from "../utils/appinsights";
import { createLogger } from "../utils/logger";

const userRCConfigurationModel = new UserRCConfigurationModel(
  remoteContentCosmosDbInstance.container(
    USER_RC_CONFIGURATIONS_COLLECTION_NAME
  )
);

// Get config
const config = getConfigOrThrow();

// eslint-disable-next-line functional/no-let
let logger: Context["log"] | undefined;
const contextTransport = new AzureContextTransport(() => logger, {
  level: "debug"
});
winston.add(contextTransport);

const telemetryClient = initTelemetryClient();

const run = async (
  context: Context,
  documents: ReadonlyArray<unknown>
): Promise<void> => {
  const logger = createLogger(context, telemetryClient, "CosmosRemoteContentMessageConfigurationChangeFeed");
  handler(
    userRCConfigurationModel,
    logger,
    config.MESSAGE_CONFIGURATION_CHANGE_FEED_START_TIME
  )(documents);
};

export default run;
