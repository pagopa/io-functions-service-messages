import { Context } from "@azure/functions";

import {
  UserRCConfigurationModel,
  USER_RC_CONFIGURATIONS_COLLECTION_NAME,
  RetrievedUserRCConfiguration
} from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { remoteContentCosmosDbInstance } from "../utils/cosmosdb";
import { getConfigOrThrow } from "../utils/config";
import { initTelemetryClient } from "../utils/appinsights";
import { createLogger } from "../utils/logger";
import { handler } from "./handler";

const userRCConfigurationModel = new UserRCConfigurationModel(
  remoteContentCosmosDbInstance.container(
    USER_RC_CONFIGURATIONS_COLLECTION_NAME
  )
);

// Get config
const config = getConfigOrThrow();

const telemetryClient = initTelemetryClient();

const run = async (
  context: Context,
  documents: ReadonlyArray<unknown>
): Promise<void> => {
  const logger = createLogger(
    context,
    telemetryClient,
    "CosmosRemoteContentMessageConfigurationChangeFeed"
  );
  handler(
    userRCConfigurationModel,
    logger,
    config.MESSAGE_CONFIGURATION_CHANGE_FEED_START_TIME
  )(documents);
};

export default run;
