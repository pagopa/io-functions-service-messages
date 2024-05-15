import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";
import * as redis_storage from "../../utils/redis_storage";

import { envConfig } from "../../__mocks__/env-config.mock";

import {
  handleEmptyConfiguration,
  handleGetLastRCConfigurationVersion,
  handleUpsert,
  isUserAllowedToUpdateConfiguration
} from "../handler";
import {
  aRemoteContentConfiguration,
  findByConfigurationIdMock,
  rccModelMock,
  upsertConfigurationMock
} from "../../__mocks__/remote-content";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { redisClientMock } from "../../__mocks__/redis.mock";
import { RC_CONFIGURATION_REDIS_PREFIX } from "../../GetRCConfiguration/handler";
import { TelemetryClient } from "applicationinsights";

const setWithExpirationTaskMock = jest.fn();
jest
  .spyOn(redis_storage, "setWithExpirationTask")
  .mockImplementation(setWithExpirationTaskMock);

const trackEventMock = jest.fn();
const telemetryClientMock = ({
  trackEvent: trackEventMock
} as unknown) as TelemetryClient;

describe("isUserAllowedToUpdateConfiguration", () => {
  test("should return a left if the userId is not equal to the userId of the configuration", async () => {
    const r = await isUserAllowedToUpdateConfiguration(
      "aDifferentUserId" as NonEmptyString
    )(aRemoteContentConfiguration)();
    expect(E.isLeft(r)).toBe(true);
    if (E.isLeft(r))
      expect(r.left.kind).toBe("IResponseErrorForbiddenNotAuthorized");
  });

  test("should return a right if the userId is equal to the userId of the configuration", async () => {
    const r = await isUserAllowedToUpdateConfiguration(
      aRemoteContentConfiguration.userId
    )(aRemoteContentConfiguration)();
    expect(E.isRight(r)).toBe(true);
    if (E.isRight(r)) expect(r.right).toBe(aRemoteContentConfiguration);
  });
});

describe("handleEmptyConfiguration", () => {
  test("should return a left if the configuration was not found", async () => {
    const r = await handleEmptyConfiguration(O.none)();
    expect(E.isLeft(r)).toBe(true);
    if (E.isLeft(r)) expect(r.left.kind).toBe("IResponseErrorNotFound");
  });

  test("should return a right if the configuration was found", async () => {
    const r = await handleEmptyConfiguration(
      O.some(aRemoteContentConfiguration)
    )();
    expect(E.isRight(r)).toBe(true);
    if (E.isRight(r)) expect(r.right).toBe(aRemoteContentConfiguration);
  });
});

describe("handleGetLastRCConfigurationVersion", () => {
  test("should return a left if the find return an error", async () => {
    findByConfigurationIdMock.mockReturnValueOnce(TE.left({}));
    const rccModel = rccModelMock;
    const r = await handleGetLastRCConfigurationVersion(
      rccModel,
      aRemoteContentConfiguration.configurationId
    )();
    expect(E.isLeft(r)).toBe(true);
    if (E.isLeft(r)) {
      expect(r.left.detail).toContain(
        "Something went wrong trying to retrieve the configuration: "
      );
      expect(r.left.kind).toBe("IResponseErrorInternal");
    }
  });

  test("should return a right if the find return a right", async () => {
    findByConfigurationIdMock.mockReturnValueOnce(
      TE.right(O.some(aRemoteContentConfiguration))
    );
    const r = await handleGetLastRCConfigurationVersion(
      rccModelMock,
      aRemoteContentConfiguration.configurationId
    )();
    expect(E.isRight(r)).toBe(true);
    if (E.isRight(r))
      expect(r.right).toMatchObject(O.some(aRemoteContentConfiguration));
  });
});

describe("handleUpsert", () => {
  test("should return a left without calling the setTask if the upsert method fail", async () => {
    upsertConfigurationMock.mockReturnValueOnce(TE.left({}));

    const r = await handleUpsert({
      rccModel: rccModelMock,
      config: envConfig,
      redisClientFactory: redisClientMock,
      telemetryClient: telemetryClientMock
    })(aRemoteContentConfiguration)();
    expect(E.isLeft(r)).toBe(true);
    expect(setWithExpirationTaskMock).not.toHaveBeenCalled();
    if (E.isLeft(r))
      expect(r.left.detail).toContain(
        `Something went wrong trying to upsert the configuration: `
      );
  });

  test("should return a right calling the setTask if the upsert method goes well", async () => {
    upsertConfigurationMock.mockReturnValueOnce(
      TE.right(aRemoteContentConfiguration)
    );
    setWithExpirationTaskMock.mockReturnValueOnce(TE.right(true));

    const r = await handleUpsert({
      rccModel: rccModelMock,
      config: envConfig,
      redisClientFactory: redisClientMock,
      telemetryClient: telemetryClientMock
    })(aRemoteContentConfiguration)();
    expect(E.isRight(r)).toBe(true);
    expect(setWithExpirationTaskMock).toHaveBeenCalledWith(
      redisClientMock,
      `${RC_CONFIGURATION_REDIS_PREFIX}-${aRemoteContentConfiguration.configurationId}`,
      JSON.stringify(aRemoteContentConfiguration),
      envConfig.RC_CONFIGURATION_CACHE_TTL
    );
    if (E.isRight(r)) expect(r.right.kind).toBe("IResponseSuccessNoContent");
  });

  test("should return a right calling the setTask if the upsert method goes well but the setTask return an error", async () => {
    upsertConfigurationMock.mockReturnValueOnce(
      TE.right(aRemoteContentConfiguration)
    );
    setWithExpirationTaskMock.mockReturnValueOnce(
      TE.left(new Error("Something went wrong"))
    );

    const r = await handleUpsert({
      rccModel: rccModelMock,
      config: envConfig,
      redisClientFactory: redisClientMock,
      telemetryClient: telemetryClientMock
    })(aRemoteContentConfiguration)();
    expect(E.isRight(r)).toBe(true);
    expect(setWithExpirationTaskMock).toHaveBeenCalledWith(
      redisClientMock,
      `${RC_CONFIGURATION_REDIS_PREFIX}-${aRemoteContentConfiguration.configurationId}`,
      JSON.stringify(aRemoteContentConfiguration),
      envConfig.RC_CONFIGURATION_CACHE_TTL
    );
    if (E.isRight(r)) expect(r.right.kind).toBe("IResponseSuccessNoContent");
  });
});
