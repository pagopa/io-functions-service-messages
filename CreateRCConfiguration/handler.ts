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
  IResponseSuccessRedirectToResource,
  ResponseErrorInternal,
  ResponseSuccessRedirectToResource
} from "@pagopa/ts-commons/lib/responses";
import { flow, pipe } from "fp-ts/lib/function";
import {
  RCConfiguration,
  RCConfigurationModel,
  RCEnvironmentConfig,
  RCTestEnvironmentConfig
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import {
  RCClientCert as RCClientCertModel,
  RCAuthenticationConfig as RCAuthenticationConfigModel
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { retrievedRCConfigurationToPublic } from "@pagopa/io-functions-commons/dist/src/utils/rc_configuration";
import { RCConfigurationPublic } from "../generated/definitions/RCConfigurationPublic";
import { RequiredUserIdMiddleware } from "../middlewares/required_headers_middleware";
import { RCClientCert } from "../generated/definitions/RCClientCert";
import { RCAuthenticationConfig } from "../generated/definitions/RCAuthenticationConfig";
import { RCConfigurationProdEnvironment } from "../generated/definitions/RCConfigurationProdEnvironment";
import { RCConfigurationTestEnvironment } from "../generated/definitions/RCConfigurationTestEnvironment";
import { NewRCConfigurationPublic } from "../generated/definitions/NewRCConfigurationPublic";

const getPublicCert = (cert: RCClientCert): RCClientCertModel => ({
  clientCert: cert.client_cert,
  clientKey: cert.client_key,
  serverCa: cert.server_ca
});

/**
 * Convert the detail autenthication from snake case to camel case
 * */
const getModelDetailsAuthentication = (
  detailsAuth: RCAuthenticationConfig
): RCAuthenticationConfigModel => ({
  cert: detailsAuth.cert ? getPublicCert(detailsAuth.cert) : undefined,
  headerKeyName: detailsAuth.header_key_name,
  key: detailsAuth.key,
  type: detailsAuth.type
});

/**
 * Convert the prod environment from snake case to camel case
 * */
export const getModelProdEnvironment = (
  prodEnvironment: RCConfigurationProdEnvironment
): RCEnvironmentConfig => ({
  baseUrl: prodEnvironment.base_url,
  detailsAuthentication: getModelDetailsAuthentication(
    prodEnvironment.details_authentication
  )
});

/**
 * Convert the test environment from snake case to camel case
 * */
const getModelTestEnvironment = (
  testEnv: RCConfigurationTestEnvironment
): RCTestEnvironmentConfig => ({
  baseUrl: testEnv.base_url,
  detailsAuthentication: getModelDetailsAuthentication(
    testEnv.details_authentication
  ),
  testUsers: testEnv.test_users
});

/**
 * Convert the RCConfiguration from snake case to camel case
 * */
export const makeNewRCConfigurationWithConfigurationId = (
  generateConfigurationId: () => Ulid,
  userId: NonEmptyString,
  publicConfiguration: NewRCConfigurationPublic
): RCConfiguration => ({
  configurationId: generateConfigurationId(),
  description: publicConfiguration.description,
  disableLollipopFor: publicConfiguration.disable_lollipop_for,
  hasPrecondition: publicConfiguration.has_precondition,
  isLollipopEnabled: publicConfiguration.is_lollipop_enabled,
  name: publicConfiguration.name,
  prodEnvironment: publicConfiguration.prod_environment
    ? getModelProdEnvironment(publicConfiguration.prod_environment)
    : undefined,
  testEnvironment: publicConfiguration.test_environment
    ? getModelTestEnvironment(publicConfiguration.test_environment)
    : undefined,
  userId
});

interface IHandlerParameter {
  readonly newRCConfiguration: NewRCConfigurationPublic;
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
>;

type CreateRCConfigurationHandler = (
  parameter: ICreateRCConfigurationHandlerParameter
) => CreateRCConfigurationHandlerReturnType;

export const createRCConfigurationHandler: CreateRCConfigurationHandler = ({
  rccModel,
  generateConfigurationId
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
}) => ({ newRCConfiguration, userId }) =>
  pipe(
    rccModel.create(
      makeNewRCConfigurationWithConfigurationId(
        generateConfigurationId,
        userId,
        newRCConfiguration
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
    TE.mapLeft(e =>
      ResponseErrorInternal(`Error creating the new configuration: ${e.kind}`)
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
    RequiredUserIdMiddleware(),
    RequiredBodyPayloadMiddleware(NewRCConfigurationPublic)
  );

  return wrapRequestHandler(
    middlewaresWrap((_, userId, newRCConfiguration) =>
      handler({ newRCConfiguration, userId })
    )
  );
};
