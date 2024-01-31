import * as express from "express";
import * as TE from "fp-ts/lib/TaskEither";

import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorValidation,
  IResponseSuccessRedirectToResource,
  ResponseErrorValidation,
  ResponseSuccessRedirectToResource
} from "@pagopa/ts-commons/lib/responses";
import { NewRCConfiguration } from "../generated/definitions/NewRCConfiguration";
import { pipe } from "fp-ts/lib/function";
import { RCConfigurationModel } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";

type HandlerParameter = {
  newRCConfiguration: NewRCConfiguration;
};

type CreateRCConfigurationHandlerParameter = {
  rccModel: RCConfigurationModel;
};

type CreateRCConfigurationHandlerReturnType = (
  parameter: HandlerParameter
) => Promise<
  | IResponseSuccessRedirectToResource<NewRCConfiguration, {}>
  | IResponseErrorValidation
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorInternal
>;

type CreateRCConfigurationHandler = (
  parameter: CreateRCConfigurationHandlerParameter
) => CreateRCConfigurationHandlerReturnType;

export const createRCConfigurationHandler: CreateRCConfigurationHandler = ({
  rccModel
}) => async ({ newRCConfiguration }) =>
  pipe(
    rccModel.create(newRCConfiguration),
    TE.map(configuration =>
      ResponseSuccessRedirectToResource(configuration, "", {})
    ),
    TE.mapLeft(e => ResponseErrorValidation(e.kind, "error")),
    TE.toUnion
  )();

type GetCreateRCConfigurationHandlerParameter = {
  rccModel: RCConfigurationModel;
};

type GetCreateRCConfigurationHandlerReturnType = express.RequestHandler;

type GetCreateRCConfigurationHandler = (
  parameter: GetCreateRCConfigurationHandlerParameter
) => GetCreateRCConfigurationHandlerReturnType;

export const getCreateRCConfigurationHandler: GetCreateRCConfigurationHandler = ({
  rccModel
}) => {
  const handler = createRCConfigurationHandler({ rccModel });

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(NewRCConfiguration)
  );

  return wrapRequestHandler(
    middlewaresWrap((context, newRCConfiguration) =>
      handler({ newRCConfiguration })
    )
  );
};
