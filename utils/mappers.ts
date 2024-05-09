import {
  RCConfiguration,
  RCEnvironmentConfig,
  RCTestEnvironmentConfig,
  RCClientCert as RCClientCertModel,
  RCAuthenticationConfig as RCAuthenticationConfigModel
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration_non_versioned_temp";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/lib/function";
import { RCClientCert } from "../generated/definitions/RCClientCert";
import { RCAuthenticationConfig } from "../generated/definitions/RCAuthenticationConfig";
import { RCConfigurationProdEnvironment } from "../generated/definitions/RCConfigurationProdEnvironment";
import { RCConfigurationTestEnvironment } from "../generated/definitions/RCConfigurationTestEnvironment";
import { NewRCConfigurationPublic } from "../generated/definitions/NewRCConfigurationPublic";

const getModelCertFromPublic = (cert: RCClientCert): RCClientCertModel => ({
  clientCert: cert.client_cert,
  clientKey: cert.client_key,
  serverCa: cert.server_ca
});

/**
 * Convert the detail autenthication from snake case to camel case
 * */
const getModelDetailsAuthenticationFromPublic = (
  detailsAuth: RCAuthenticationConfig
): RCAuthenticationConfigModel => ({
  cert: detailsAuth.cert ? getModelCertFromPublic(detailsAuth.cert) : undefined,
  headerKeyName: detailsAuth.header_key_name,
  key: detailsAuth.key,
  type: detailsAuth.type
});

/**
 * Convert the prod environment from snake case to camel case
 * */
const getModelProdEnvironmentFromPublic = (
  prodEnvironment: RCConfigurationProdEnvironment
): RCEnvironmentConfig => ({
  baseUrl: prodEnvironment.base_url,
  detailsAuthentication: getModelDetailsAuthenticationFromPublic(
    prodEnvironment.details_authentication
  )
});

/**
 * Convert the test environment from snake case to camel case
 * */
const getModelTestEnvironmentFromPublic = (
  testEnv: RCConfigurationTestEnvironment
): RCTestEnvironmentConfig => ({
  baseUrl: testEnv.base_url,
  detailsAuthentication: getModelDetailsAuthenticationFromPublic(
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
): RCConfiguration =>
  pipe(generateConfigurationId(), ulid => ({
    configurationId: ulid,
    description: publicConfiguration.description,
    disableLollipopFor: publicConfiguration.disable_lollipop_for,
    hasPrecondition: publicConfiguration.has_precondition,
    id: `${ulid}` as NonEmptyString,
    isLollipopEnabled: publicConfiguration.is_lollipop_enabled,
    name: publicConfiguration.name,
    prodEnvironment: publicConfiguration.prod_environment
      ? getModelProdEnvironmentFromPublic(publicConfiguration.prod_environment)
      : undefined,
    testEnvironment: publicConfiguration.test_environment
      ? getModelTestEnvironmentFromPublic(publicConfiguration.test_environment)
      : undefined,
    userId
  }));
