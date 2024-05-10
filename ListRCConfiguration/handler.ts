import * as express from "express";
import * as TE from "fp-ts/lib/TaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";

import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { flow, pipe } from "fp-ts/lib/function";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { retrievedRCConfigurationToPublic } from "@pagopa/io-functions-commons/dist/src/utils/rc_configuration";
import { RCConfigurationModel } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { CosmosErrors } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import { UserRCConfigurationModel } from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { RequiredUserIdMiddleware } from "../middlewares/required_headers_middleware";
import { RCConfigurationListResponse } from "../generated/definitions/RCConfigurationListResponse";

interface IHandlerParameter {
  readonly userId: NonEmptyString;
}

interface IListRCConfigurationHandlerParameter {
  readonly rcConfigurationModel: RCConfigurationModel;
  readonly userRCConfigurationModel: UserRCConfigurationModel;
}

const handleCosmosErrorResponse = (
  error: CosmosErrors
): IResponseErrorInternal =>
  ResponseErrorInternal(
    `Something went wrong trying to retrieve the configurations: ${JSON.stringify(
      error
    )}`
  );

export const listRCConfigurationHandler = ({
  rcConfigurationModel,
  userRCConfigurationModel
}: IListRCConfigurationHandlerParameter) => ({
  userId
}: IHandlerParameter): Promise<
  IResponseSuccessJson<RCConfigurationListResponse> | IResponseErrorInternal
> =>
  pipe(
    userRCConfigurationModel.findAllByUserId(userId),
    TE.chainW(configList =>
      pipe(
        configList,
        RA.map(configuration => Ulid.decode(configuration.id)),
        RA.rights,
        configIdList =>
          rcConfigurationModel.findAllByConfigurationId(configIdList)
      )
    ),
    TE.mapLeft(handleCosmosErrorResponse),
    TE.map(retrievedConfigurations =>
      pipe(
        retrievedConfigurations,
        RA.map(
          flow(retrievedRCConfigurationToPublic, publicConfig => ({
            ...publicConfig,
            user_id: userId
          }))
        ),
        rcConfigList => ResponseSuccessJson({ rcConfigList })
      )
    ),
    TE.toUnion
  )();

type ListRCConfigurationHandlerReturnType = express.RequestHandler;

type ListRCConfigurationHandler = (
  parameter: IListRCConfigurationHandlerParameter
) => ListRCConfigurationHandlerReturnType;

export const listRCConfigurationExpressHandler: ListRCConfigurationHandler = ({
  rcConfigurationModel,
  userRCConfigurationModel
}) => {
  const handler = listRCConfigurationHandler({
    rcConfigurationModel,
    userRCConfigurationModel
  });

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredUserIdMiddleware()
  );

  return wrapRequestHandler(
    middlewaresWrap((_, userId) => handler({ userId }))
  );
};
