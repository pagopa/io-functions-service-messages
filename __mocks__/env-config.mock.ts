import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { IConfig } from "../utils/config";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";

const aBlacklistedFiscalCode = "AAAAAA00A00H501I" as FiscalCode;

export const envConfig: IConfig = {
  isProduction: false,

  COSMOSDB_KEY: "aKey" as NonEmptyString,
  COSMOSDB_NAME: "aName" as NonEmptyString,
  COSMOSDB_URI: "aUri" as NonEmptyString,

  MESSAGE_CONTAINER_NAME: "aaa" as NonEmptyString,
  QueueStorageConnection: "aaa" as NonEmptyString,

  FF_TYPE: "none",
  USE_FALLBACK: false,
  FF_BETA_TESTER_LIST: [],
  FF_CANARY_USERS_REGEX: "XYZ" as NonEmptyString,

  NODE_ENV: "production",
  REQ_SERVICE_ID: undefined
};
