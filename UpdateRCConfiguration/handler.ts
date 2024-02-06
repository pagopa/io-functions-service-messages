import * as express from "express";
import * as TE from "fp-ts/lib/TaskEither";

import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorForbiddenAnonymousUser,
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessNoContent,
  ResponseErrorForbiddenAnonymousUser,
  ResponseErrorInternal,
  ResponseErrorNotFound,
  ResponseSuccessNoContent
} from "@pagopa/ts-commons/lib/responses";
import { pipe } from "fp-ts/lib/function";
import { RCConfigurationModel } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { NewRCConfiguration } from "../generated/definitions/NewRCConfiguration";
import { RequiredUserIdMiddleware } from "../utils/middlewares";

interface IHandlerParameter {
  readonly configurationId: Ulid;
  readonly newRCConfiguration: NewRCConfiguration;
  readonly userId: NonEmptyString;
}

interface IUpdateRCConfigurationHandlerParameter {
  readonly rccModel: RCConfigurationModel;
}

type UpdateRCConfigurationHandlerReturnType = (
  parameter: IHandlerParameter
) => Promise<
  | IResponseSuccessNoContent
  | IResponseErrorNotFound
  | IResponseErrorInternal
  | IResponseErrorForbiddenAnonymousUser
>;

type UpdateRCConfigurationHandler = (
  parameter: IUpdateRCConfigurationHandlerParameter
) => UpdateRCConfigurationHandlerReturnType;

export const updateRCConfigurationHandler: UpdateRCConfigurationHandler = ({
  rccModel
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
}) => ({ newRCConfiguration, configurationId, userId }) =>
  pipe(
    rccModel.findLastVersionByModelId([configurationId]),
    TE.mapLeft(e =>
      ResponseErrorInternal(
        `Something went wrong trying to retrieve the configuration: ${e}`
      )
    ),
    TE.chainW(
      TE.fromOption(() =>
        ResponseErrorNotFound(
          `Configuration not found`,
          `Cannot find any remote-content configuration with id: ${configurationId}`
        )
      )
    ),
    TE.chainW(
      TE.fromPredicate(
        configuration => configuration.userId === userId,
        () => ResponseErrorForbiddenAnonymousUser
      )
    ),
    TE.chainW(() =>
      pipe(
        rccModel.upsert({ ...newRCConfiguration, configurationId, userId }),
        TE.mapLeft(e =>
          ResponseErrorInternal(
            `Something went wrong trying to upsert the configuration: ${e}`
          )
        ),
        TE.map(ResponseSuccessNoContent)
      )
    ),
    TE.toUnion
  )();

interface IGetUpdateRCConfigurationHandlerParameter {
  readonly rccModel: RCConfigurationModel;
}

type GetUpdateRCConfigurationHandlerReturnType = express.RequestHandler;

type GetUpdateRCConfigurationHandler = (
  parameter: IGetUpdateRCConfigurationHandlerParameter
) => GetUpdateRCConfigurationHandlerReturnType;

export const getUpdateRCConfigurationExpressHandler: GetUpdateRCConfigurationHandler = ({
  rccModel
}) => {
  const handler = updateRCConfigurationHandler({
    rccModel
  });

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredUserIdMiddleware(),
    RequiredParamMiddleware("configurationId", Ulid),
    RequiredBodyPayloadMiddleware(NewRCConfiguration)
  );

  return wrapRequestHandler(
    middlewaresWrap((_, configurationId, userId, newRCConfiguration) =>
      handler({ configurationId, newRCConfiguration, userId })
    )
  );
};
