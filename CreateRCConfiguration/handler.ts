import * as express from "express";
import * as TE from "fp-ts/lib/TaskEither";

import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorInternal,
  IResponseErrorValidation,
  IResponseSuccessRedirectToResource,
  ResponseErrorInternal,
  ResponseSuccessRedirectToResource
} from "@pagopa/ts-commons/lib/responses";
import { NewRCConfiguration } from "../generated/definitions/NewRCConfiguration";
import { pipe } from "fp-ts/lib/function";
import {
  RCConfiguration,
  RCConfigurationModel
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { Ulid } from "@pagopa/ts-commons/lib/strings";
import { ObjectIdGenerator } from "@pagopa/io-functions-commons/dist/src/utils/strings";

export const getNewRCConfigurationWithConfigurationId = (
  generateConfigurationId: ObjectIdGenerator
) => (newRCConfiguration: NewRCConfiguration): RCConfiguration => ({
  ...newRCConfiguration,
  // TODO: fix this cast
  configurationId: (generateConfigurationId() as unknown) as Ulid
});

type HandlerParameter = {
  newRCConfiguration: NewRCConfiguration;
};

type CreateRCConfigurationHandlerParameter = {
  rccModel: RCConfigurationModel;
  generateConfigurationId: ObjectIdGenerator;
};

type CreateRCConfigurationHandlerReturnType = (
  parameter: HandlerParameter
) => Promise<
  | IResponseSuccessRedirectToResource<NewRCConfiguration, {}>
  | IResponseErrorValidation
  | IResponseErrorInternal
>;

type CreateRCConfigurationHandler = (
  parameter: CreateRCConfigurationHandlerParameter
) => CreateRCConfigurationHandlerReturnType;

export const createRCConfigurationHandler: CreateRCConfigurationHandler = ({
  rccModel,
  generateConfigurationId
}) => async ({ newRCConfiguration }) =>
  pipe(
    newRCConfiguration,
    getNewRCConfigurationWithConfigurationId(generateConfigurationId),
    rccModel.create,
    TE.map(configuration =>
      ResponseSuccessRedirectToResource(
        configuration,
        `/api/v1/remote-contents/configurations/`,
        {
          id: configuration.configurationId
        }
      )
    ),
    TE.mapLeft(e =>
      ResponseErrorInternal(`Error creating the new configuration: ${e.kind}`)
    ),
    TE.toUnion
  )();

type GetCreateRCConfigurationHandlerParameter = {
  rccModel: RCConfigurationModel;
  generateConfigurationId: ObjectIdGenerator;
};

type GetCreateRCConfigurationHandlerReturnType = express.RequestHandler;

type GetCreateRCConfigurationHandler = (
  parameter: GetCreateRCConfigurationHandlerParameter
) => GetCreateRCConfigurationHandlerReturnType;

export const getCreateRCConfigurationExpressHandler: GetCreateRCConfigurationHandler = ({
  rccModel,
  generateConfigurationId
}) => {
  const handler = createRCConfigurationHandler({
    rccModel,
    generateConfigurationId
  });

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(NewRCConfiguration)
  );

  return wrapRequestHandler(
    // TODO: use context to add logs
    middlewaresWrap((context, newRCConfiguration) =>
      handler({ newRCConfiguration })
    )
  );
};
