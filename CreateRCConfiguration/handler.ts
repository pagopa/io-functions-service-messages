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
  IResponseSuccessRedirectToResource,
  ResponseSuccessRedirectToResource
} from "@pagopa/ts-commons/lib/responses";
import { flow, pipe } from "fp-ts/lib/function";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { retrievedRCConfigurationToPublic } from "@pagopa/io-functions-commons/dist/src/utils/rc_configuration";
import { RCConfigurationModel } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { RCConfigurationPublic } from "../generated/definitions/RCConfigurationPublic";
import {
  RequiredSubscriptionIdMiddleware,
  RequiredUserGroupsMiddleware,
  RequiredUserIdMiddleware
} from "../middlewares/required_headers_middleware";
import { NewRCConfigurationPublic } from "../generated/definitions/NewRCConfigurationPublic";
import { makeNewRCConfigurationWithConfigurationId } from "../utils/mappers";
import { checkGroupAndManageSubscription } from "../utils/remote_content";
import { handleCosmosErrorResponse } from "../utils/response";

interface IHandlerParameter {
  readonly newRCConfiguration: NewRCConfigurationPublic;
  readonly subscriptionId: NonEmptyString;
  readonly userGroups: NonEmptyString;
  readonly userId: NonEmptyString;
}

interface ICreateRCConfigurationHandlerParameter {
  readonly rccModel: RCConfigurationModel;
  readonly generateConfigurationId: () => Ulid;
}

type CreateRCConfigurationHandlerReturnType = (
  parameter: IHandlerParameter
) => Promise<
  // eslint-disable-next-line @typescript-eslint/ban-types
  | IResponseSuccessRedirectToResource<RCConfigurationPublic, {}>
  | IResponseErrorInternal
  | IResponseErrorForbiddenNotAuthorized
>;

type CreateRCConfigurationHandler = (
  parameter: ICreateRCConfigurationHandlerParameter
) => CreateRCConfigurationHandlerReturnType;

export const createRCConfigurationHandler: CreateRCConfigurationHandler = ({
  rccModel,
  generateConfigurationId
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
}) => ({ newRCConfiguration, subscriptionId, userGroups, userId }) =>
  pipe(
    checkGroupAndManageSubscription(subscriptionId, userGroups),
    TE.chainW(_ =>
      pipe(
        rccModel.create(
          makeNewRCConfigurationWithConfigurationId(
            generateConfigurationId,
            userId,
            newRCConfiguration
          )
        ),
        TE.mapLeft(
          handleCosmosErrorResponse(
            "Something went wrong trying to create the configuration"
          )
        )
      )
    ),
    TE.map(
      flow(retrievedRCConfigurationToPublic, publicConfiguration =>
        ResponseSuccessRedirectToResource(
          publicConfiguration,
          `/api/v1/remote-contents/configurations/`,
          publicConfiguration
        )
      )
    ),
    TE.toUnion
  )();

interface IGetCreateRCConfigurationHandlerParameter {
  readonly rccModel: RCConfigurationModel;
  readonly generateConfigurationId: () => Ulid;
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
    RequiredSubscriptionIdMiddleware(),
    RequiredUserGroupsMiddleware(),
    RequiredUserIdMiddleware(),
    RequiredBodyPayloadMiddleware(NewRCConfigurationPublic)
  );

  return wrapRequestHandler(
    middlewaresWrap(
      (_, subscriptionId, userGroups, userId, newRCConfiguration) =>
        handler({ newRCConfiguration, subscriptionId, userGroups, userId })
    )
  );
};
