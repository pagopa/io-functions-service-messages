import * as express from "express";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";

import { Json } from "fp-ts/lib/Json";

import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorForbiddenNotAuthorized,
  ResponseErrorInternal,
  ResponseErrorNotFound,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { flow, pipe } from "fp-ts/lib/function";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { retrievedRCConfigurationToPublic } from "@pagopa/io-functions-commons/dist/src/utils/rc_configuration";
import {
  RCConfigurationModel,
  RetrievedRCConfiguration
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import { parse } from "fp-ts/lib/Json";
import { RequiredUserIdMiddleware } from "../middlewares/required_headers_middleware";
import { RCConfigurationResponse } from "../generated/definitions/RCConfigurationResponse";
import { IConfig } from "../utils/config";
import { getTask, setWithExpirationTask } from "../utils/redis_storage";
import { RedisClientFactory } from "../utils/redis";

export const RC_CONFIGURATION_REDIS_PREFIX = "RC-CONFIGURATION";

interface IHandlerParameter {
  readonly configurationId: Ulid;
  readonly userId: NonEmptyString;
}

interface IGetRCConfigurationHandlerParameter {
  readonly config: IConfig;
  readonly rccModel: RCConfigurationModel;
  readonly redisClient: RedisClientFactory;
}

export const handleErrorResponse = (error: Error): IResponseErrorInternal =>
  ResponseErrorInternal(
    `Something went wrong trying to retrieve the configuration: ${error}`
  );

export const handleEmptyErrorResponse = (configurationId: Ulid) => (
  maybeRCConfiguration: O.Option<RetrievedRCConfiguration>
): TE.TaskEither<IResponseErrorNotFound, RetrievedRCConfiguration> =>
  pipe(
    maybeRCConfiguration,
    TE.fromOption(() =>
      ResponseErrorNotFound(
        `Configuration not found`,
        `Cannot find any configuration with configurationId: ${configurationId}`
      )
    )
  );

const parseRedisValue: (redisValue: string) => E.Either<Error, Json> = flow(
  parse,
  E.mapLeft(() => new Error("Cannot parse RCConfiguration Json from Redis"))
);

const validateRedisValue: (
  redisValue: string
) => E.Either<Error, RetrievedRCConfiguration> = flow(
  RetrievedRCConfiguration.decode,
  E.mapLeft(() => new Error("Cannot decode RCConfiguration Json from Redis"))
);

const parseAndValidateRedisValue: (
  redisValue: string
) => E.Either<Error, RetrievedRCConfiguration> = flow(
  parseRedisValue,
  E.chain(validateRedisValue)
);

const handleRedisEmptyResponse: (
  maybeRedisResponse: O.Option<string>
) => TE.TaskEither<Error, string> = TE.fromOption(
  () => new Error("Cannot Get RCConfiguration from Redis")
);

/**
 * This method is used to get a configuration, if it exists, by configuratin id.
 * If the configuration is cached it retrieves it from cache, or else it retrieves
 * it from cosmosdb and provides to cache it.
 *
 * @param configurationId
 * @returns
 */
const getOrCacheMaybeRCConfigurationById = (
  configurationId: Ulid,
  redisClient: RedisClientFactory,
  rccModel: RCConfigurationModel,
  config: IConfig
): TE.TaskEither<Error, O.Option<RetrievedRCConfiguration>> =>
  pipe(
    getTask(redisClient, `${RC_CONFIGURATION_REDIS_PREFIX}-${configurationId}`),
    TE.chain(handleRedisEmptyResponse),
    TE.chainEitherK(parseAndValidateRedisValue),
    TE.fold(
      () =>
        pipe(
          rccModel.findLastVersionByModelId([configurationId]),
          TE.mapLeft(
            e => new Error(`${e.kind}, RCConfiguration Id=${configurationId}`)
          ),
          TE.chain(maybeRCConfiguration =>
            pipe(
              maybeRCConfiguration,
              O.fold(
                () => TE.right(maybeRCConfiguration),
                rCConfiguration =>
                  pipe(
                    setWithExpirationTask(
                      redisClient,
                      `${RC_CONFIGURATION_REDIS_PREFIX}-${configurationId}`,
                      JSON.stringify(rCConfiguration),
                      config.RC_CONFIGURATION_CACHE_TTL
                    ),
                    TE.map(() => maybeRCConfiguration)
                  )
              )
            )
          )
        ),
      rCConfiguration => TE.right(O.some(rCConfiguration))
    )
  );

export const getRCConfigurationHandler = ({
  rccModel,
  config,
  redisClient
}: IGetRCConfigurationHandlerParameter) => ({
  configurationId,
  userId
}: IHandlerParameter): Promise<
  | IResponseSuccessJson<RCConfigurationResponse>
  | IResponseErrorNotFound
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorInternal
> =>
  pipe(
    getOrCacheMaybeRCConfigurationById(
      configurationId,
      redisClient,
      rccModel,
      config
    ),
    TE.mapLeft(handleErrorResponse),
    TE.chainW(handleEmptyErrorResponse(configurationId)),
    TE.chainW(
      TE.fromPredicate(
        retrievedConfiguration =>
          config.INTERNAL_USER_ID === userId ||
          retrievedConfiguration.userId === userId,
        () => ResponseErrorForbiddenNotAuthorized
      )
    ),
    TE.map(retrievedConfiguration =>
      pipe(
        retrievedConfiguration,
        retrievedRCConfigurationToPublic,
        publicConfiguration => ({
          ...publicConfiguration,
          user_id: retrievedConfiguration.userId
        }),
        ResponseSuccessJson
      )
    ),
    TE.toUnion
  )();

interface IGetGetRCConfigurationHandlerParameter {
  readonly config: IConfig;
  readonly rccModel: RCConfigurationModel;
  readonly redisClient: RedisClientFactory;
}

type GetGetRCConfigurationHandlerReturnType = express.RequestHandler;

type GetGetRCConfigurationHandler = (
  parameter: IGetGetRCConfigurationHandlerParameter
) => GetGetRCConfigurationHandlerReturnType;

export const getGetRCConfigurationExpressHandler: GetGetRCConfigurationHandler = ({
  rccModel,
  config,
  redisClient
}) => {
  const handler = getRCConfigurationHandler({
    config,
    rccModel,
    redisClient
  });

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredUserIdMiddleware(),
    RequiredParamMiddleware("configurationId", Ulid)
  );

  return wrapRequestHandler(
    middlewaresWrap((_, userId, configurationId) =>
      handler({ configurationId, userId })
    )
  );
};
