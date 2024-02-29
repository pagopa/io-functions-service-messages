import * as express from "express";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";

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
import { CosmosErrors } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import { RequiredUserIdMiddleware } from "../middlewares/required_headers_middleware";
import { RCConfigurationResponse } from "../generated/definitions/RCConfigurationResponse";
import { IConfig } from "../utils/config";

interface IHandlerParameter {
  readonly configurationId: Ulid;
  readonly userId: NonEmptyString;
}

interface IGetRCConfigurationHandlerParameter {
  readonly config: IConfig;
  readonly rccModel: RCConfigurationModel;
}

export const handleCosmosErrorResponse = (
  error: CosmosErrors
): IResponseErrorInternal =>
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

export const getRCConfigurationHandler = ({
  rccModel,
  config
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
    rccModel.findLastVersionByModelId([configurationId]),
    TE.mapLeft(handleCosmosErrorResponse),
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
}

type GetGetRCConfigurationHandlerReturnType = express.RequestHandler;

type GetGetRCConfigurationHandler = (
  parameter: IGetGetRCConfigurationHandlerParameter
) => GetGetRCConfigurationHandlerReturnType;

export const getGetRCConfigurationExpressHandler: GetGetRCConfigurationHandler = ({
  rccModel,
  config
}) => {
  const handler = getRCConfigurationHandler({
    config,
    rccModel
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
