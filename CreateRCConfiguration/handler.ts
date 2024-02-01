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
import { pipe } from "fp-ts/lib/function";
import {
  RCConfiguration,
  RCConfigurationModel
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { Ulid } from "@pagopa/ts-commons/lib/strings";
import { ObjectIdGenerator } from "@pagopa/io-functions-commons/dist/src/utils/strings";
import { NewRCConfiguration } from "../generated/definitions/NewRCConfiguration";

export const getNewRCConfigurationWithConfigurationId = (
  generateConfigurationId: ObjectIdGenerator
) => (newRCConfiguration: NewRCConfiguration): RCConfiguration => ({
  configurationId: (generateConfigurationId() as unknown) as Ulid,
  ...newRCConfiguration
});

interface IHandlerParameter {
  readonly newRCConfiguration: NewRCConfiguration;
}

interface ICreateRCConfigurationHandlerParameter {
  readonly rccModel: RCConfigurationModel;
  readonly generateConfigurationId: ObjectIdGenerator;
}

type CreateRCConfigurationHandlerReturnType = (
  parameter: IHandlerParameter
) => Promise<
  // eslint-disable-next-line @typescript-eslint/ban-types
  | IResponseSuccessRedirectToResource<NewRCConfiguration, {}>
  | IResponseErrorValidation
  | IResponseErrorInternal
>;

type CreateRCConfigurationHandler = (
  parameter: ICreateRCConfigurationHandlerParameter
) => CreateRCConfigurationHandlerReturnType;

export const createRCConfigurationHandler: CreateRCConfigurationHandler = ({
  rccModel,
  generateConfigurationId
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
}) => ({ newRCConfiguration }) =>
  pipe(
    rccModel.create(
      getNewRCConfigurationWithConfigurationId(generateConfigurationId)(
        newRCConfiguration
      )
    ),
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

interface IGetCreateRCConfigurationHandlerParameter {
  readonly rccModel: RCConfigurationModel;
  readonly generateConfigurationId: ObjectIdGenerator;
}

type GetCreateRCConfigurationHandlerReturnType = express.RequestHandler;

type GetCreateRCConfigurationHandler = (
  parameter: IGetCreateRCConfigurationHandlerParameter
) => GetCreateRCConfigurationHandlerReturnType;

export const getCreateRCConfigurationExpressHandler: GetCreateRCConfigurationHandler = ({
  rccModel,
  generateConfigurationId
}) => {
  const handler = createRCConfigurationHandler({
    generateConfigurationId,
    rccModel
  });

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(NewRCConfiguration)
  );

  return wrapRequestHandler(
    middlewaresWrap((_, newRCConfiguration) => handler({ newRCConfiguration }))
  );
};
