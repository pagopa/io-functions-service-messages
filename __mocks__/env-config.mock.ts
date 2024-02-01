import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { IConfig } from "../utils/config";

export const envConfig: IConfig = {
  isProduction: false,

  APPINSIGHTS_INSTRUMENTATIONKEY: "aKey" as NonEmptyString,

  COSMOSDB_KEY: "aKey" as NonEmptyString,
  COSMOSDB_NAME: "aName" as NonEmptyString,
  COSMOSDB_URI: "aUri" as NonEmptyString,

  REMOTE_CONTENT_COSMOSDB_KEY: "aKey" as NonEmptyString,
  REMOTE_CONTENT_COSMOSDB_NAME: "aName" as NonEmptyString,
  REMOTE_CONTENT_COSMOSDB_URI: "aUri" as NonEmptyString,

  MESSAGE_CONTAINER_NAME: "aaa" as NonEmptyString,
  QueueStorageConnection: "aaa" as NonEmptyString,

  FF_TYPE: "none",
  USE_FALLBACK: false,
  FF_BETA_TESTERS: [],
  FF_CANARY_USERS_REGEX: "XYZ" as NonEmptyString,

  NODE_ENV: "production",
  REQ_SERVICE_ID: undefined,

  MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: "aConnString" as NonEmptyString,

  NOTIFICATION_QUEUE_NAME: "aQueueName" as NonEmptyString,
  NOTIFICATION_QUEUE_STORAGE_CONNECTION_STRING: "aQueueName" as NonEmptyString,

  BACKEND_BASE_URL: "aBaseUrl" as NonEmptyString,
  BACKEND_TOKEN: "aToken" as NonEmptyString
};
