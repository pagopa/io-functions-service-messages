/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import * as t from "io-ts";

import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import {
  IntegerFromString,
  NonNegativeInteger,
  NonNegativeIntegerFromString
} from "@pagopa/ts-commons/lib/numbers";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import { BooleanFromString } from "@pagopa/ts-commons/lib/booleans";
import { CommaSeparatedListOf } from "./types";

// exclude a specific value from a type
// as strict equality is performed, allowed input types are constrained to be values not references (object, arrays, etc)
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const AnyBut = <A extends string | number | boolean | symbol, Out = A>(
  but: A,
  base: t.Type<A, Out> = t.any
) =>
  t.brand(
    base,
    (
      s
    ): s is t.Branded<
      t.TypeOf<typeof base>,
      { readonly AnyBut: unique symbol }
    > => s !== but,
    "AnyBut"
  );

// configuration for REQ_SERVICE_ID in dev
export type ReqServiceIdConfig = t.TypeOf<typeof ReqServiceIdConfig>;
export const ReqServiceIdConfig = t.union([
  t.interface({
    NODE_ENV: t.literal("production"),
    REQ_SERVICE_ID: t.undefined
  }),
  t.interface({
    NODE_ENV: AnyBut("production", t.string),
    REQ_SERVICE_ID: NonEmptyString
  })
]);

export const FeatureFlagType = t.union([
  t.literal("none"),
  t.literal("beta"),
  t.literal("canary"),
  t.literal("prod")
]);
export type FeatureFlagType = t.TypeOf<typeof FeatureFlagType>;

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t.intersection([
  t.interface({
    /* eslint-disable sort-keys */
    APPINSIGHTS_INSTRUMENTATIONKEY: NonEmptyString,

    COSMOSDB_KEY: NonEmptyString,
    COSMOSDB_NAME: NonEmptyString,
    COSMOSDB_URI: NonEmptyString,

    REMOTE_CONTENT_COSMOSDB_KEY: NonEmptyString,
    REMOTE_CONTENT_COSMOSDB_NAME: NonEmptyString,
    REMOTE_CONTENT_COSMOSDB_URI: NonEmptyString,

    MESSAGE_CONTAINER_NAME: NonEmptyString,

    QueueStorageConnection: NonEmptyString,

    FF_TYPE: withDefault(t.string, "none").pipe(FeatureFlagType),
    USE_FALLBACK: withDefault(t.string, "false").pipe(BooleanFromString),
    FF_BETA_TESTERS: withDefault(t.string, "").pipe(
      CommaSeparatedListOf(NonEmptyString)
    ),
    FF_CANARY_USERS_REGEX: withDefault(t.string, "XYZ").pipe(NonEmptyString),

    BACKEND_BASE_URL: NonEmptyString,
    BACKEND_TOKEN: NonEmptyString,
    MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: NonEmptyString,
    NOTIFICATION_QUEUE_NAME: NonEmptyString,
    NOTIFICATION_QUEUE_STORAGE_CONNECTION_STRING: NonEmptyString,

    MESSAGE_CONFIGURATION_CHANGE_FEED_START_TIME: NonNegativeInteger,

    isProduction: t.boolean
    /* eslint-enable sort-keys */
  }),
  ReqServiceIdConfig
]);

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode({
  ...process.env,
  MESSAGE_CONFIGURATION_CHANGE_FEED_START_TIME: pipe(
    process.env.MESSAGE_CONFIGURATION_CHANGE_FEED_START_TIME,
    NonNegativeIntegerFromString.decode,
    E.getOrElse(() => 0 as NonNegativeInteger)
  ),
  SERVICE_CACHE_TTL_DURATION: pipe(
    process.env.SERVICE_CACHE_TTL_DURATION,
    IntegerFromString.decode,
    E.getOrElse(() => 3600 * 8)
  ),
  isProduction: process.env.NODE_ENV === "production"
});

/**
 * Read the application configuration and check for invalid values.
 * Configuration is eagerly evalued when the application starts.
 *
 * @returns either the configuration values or a list of validation errors
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function getConfig(): t.Validation<IConfig> {
  return errorOrConfig;
}

/**
 * Read the application configuration and check for invalid values.
 * If the application is not valid, raises an exception.
 *
 * @returns the configuration values
 * @throws validation errors found while parsing the application configuration
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function getConfigOrThrow(): IConfig {
  return pipe(
    errorOrConfig,
    E.getOrElse(errors => {
      throw new Error(`Invalid configuration: ${readableReport(errors)}`);
    })
  );
}
