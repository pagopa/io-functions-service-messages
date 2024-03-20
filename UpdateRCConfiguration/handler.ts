import * as express from "express";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";

import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessNoContent,
  ResponseErrorForbiddenNotAuthorized,
  ResponseErrorInternal,
  ResponseErrorNotFound,
  ResponseSuccessNoContent
} from "@pagopa/ts-commons/lib/responses";
import { pipe } from "fp-ts/lib/function";
import {
  RCConfiguration,
  RCConfigurationModel
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { NewRCConfigurationPublic } from "../generated/definitions/NewRCConfigurationPublic";
import { RequiredUserIdMiddleware } from "../middlewares/required_headers_middleware";
import { makeNewRCConfigurationWithConfigurationId } from "../utils/mappers";
import { setWithExpirationTask } from "../utils/redis_storage";
import { RedisClientFactory } from "../utils/redis";
import { RC_CONFIGURATION_REDIS_PREFIX } from "../GetRCConfiguration/handler";
import { IConfig } from "../utils/config";

export const isUserAllowedToUpdateConfiguration = (
  userId: NonEmptyString
): ((
  configuration: RCConfiguration
) => TE.TaskEither<IResponseErrorForbiddenNotAuthorized, RCConfiguration>) =>
  TE.fromPredicate(
    configuration => configuration.userId === userId,
    () => ResponseErrorForbiddenNotAuthorized
  );

interface IHandleUpsertParameter {
  readonly rccModel: RCConfigurationModel;
  readonly redisClientFactory: RedisClientFactory;
  readonly config: IConfig;
}

export const handleUpsert = ({
  rccModel,
  redisClientFactory,
  config
}: IHandleUpsertParameter) => (
  newRCConfiguration: RCConfiguration
): TE.TaskEither<IResponseErrorInternal, IResponseSuccessNoContent> =>
  pipe(
    rccModel.upsert(newRCConfiguration),
    TE.mapLeft(e =>
      ResponseErrorInternal(
        `Something went wrong trying to upsert the configuration: ${e}`
      )
    ),
    TE.chainFirst(rcConfiguration =>
      pipe(
        setWithExpirationTask(
          redisClientFactory,
          `${RC_CONFIGURATION_REDIS_PREFIX}-${rcConfiguration.configurationId}`,
          JSON.stringify(rcConfiguration),
          config.RC_CONFIGURATION_CACHE_TTL
        ),
        TE.orElseW(() => TE.of(rcConfiguration))
      )
    ),
    TE.map(ResponseSuccessNoContent)
  );

export const handleEmptyConfiguration = (
  maybeConfiguration: O.Option<RCConfiguration>
): TE.TaskEither<IResponseErrorNotFound, RCConfiguration> =>
  pipe(
    maybeConfiguration,
    TE.fromOption(() =>
      ResponseErrorNotFound(
        `Configuration not found`,
        `Cannot find any remote-content configuration`
      )
    )
  );

export const handleGetLastRCConfigurationVersion = (
  rccModel: RCConfigurationModel,
  configurationId: Ulid
): TE.TaskEither<IResponseErrorInternal, O.Option<RCConfiguration>> =>
  pipe(
    rccModel.findLastVersionByModelId([configurationId]),
    TE.mapLeft(e =>
      ResponseErrorInternal(
        `Something went wrong trying to retrieve the configuration: ${e}`
      )
    )
  );

interface IHandlerParameter {
  readonly configurationId: Ulid;
  readonly newRCConfiguration: NewRCConfigurationPublic;
  readonly userId: NonEmptyString;
}

interface IUpdateRCConfigurationHandlerParameter {
  readonly rccModel: RCConfigurationModel;
  readonly redisClientFactory: RedisClientFactory;
  readonly config: IConfig;
}

type UpdateRCConfigurationHandlerReturnType = (
  parameter: IHandlerParameter
) => Promise<
  | IResponseSuccessNoContent
  | IResponseErrorNotFound
  | IResponseErrorInternal
  | IResponseErrorForbiddenNotAuthorized
>;

type UpdateRCConfigurationHandler = (
  parameter: IUpdateRCConfigurationHandlerParameter
) => UpdateRCConfigurationHandlerReturnType;

export const updateRCConfigurationHandler: UpdateRCConfigurationHandler = ({
  rccModel,
  redisClientFactory,
  config
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
}) => ({ newRCConfiguration, configurationId, userId }) =>
  pipe(
    handleGetLastRCConfigurationVersion(rccModel, configurationId),
    TE.chainW(handleEmptyConfiguration),
    TE.chainW(isUserAllowedToUpdateConfiguration(userId)),
    TE.map(() =>
      makeNewRCConfigurationWithConfigurationId(
        () => configurationId,
        userId,
        newRCConfiguration
      )
    ),
    TE.chainW(handleUpsert({ config, rccModel, redisClientFactory })),
    TE.toUnion
  )();

interface IGetUpdateRCConfigurationHandlerParameter {
  readonly rccModel: RCConfigurationModel;
  readonly redisClientFactory: RedisClientFactory;
  readonly config: IConfig;
}

type GetUpdateRCConfigurationHandlerReturnType = express.RequestHandler;

type GetUpdateRCConfigurationHandler = (
  parameter: IGetUpdateRCConfigurationHandlerParameter
) => GetUpdateRCConfigurationHandlerReturnType;

export const getUpdateRCConfigurationExpressHandler: GetUpdateRCConfigurationHandler = ({
  rccModel,
  redisClientFactory,
  config
}) => {
  const handler = updateRCConfigurationHandler({
    config,
    rccModel,
    redisClientFactory
  });

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredUserIdMiddleware(),
    RequiredParamMiddleware("configurationId", Ulid),
    RequiredBodyPayloadMiddleware(NewRCConfigurationPublic)
  );

  return wrapRequestHandler(
    middlewaresWrap((_, userId, configurationId, newRCConfiguration) =>
      handler({ configurationId, newRCConfiguration, userId })
    )
  );
};
