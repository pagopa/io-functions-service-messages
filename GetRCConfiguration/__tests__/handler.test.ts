import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";

import {
  aRemoteContentConfiguration,
  findLastVersionMock,
  rccModelMock
} from "../../__mocks__/remote-content";

import {
  getRCConfigurationHandler,
  handleEmptyErrorResponse
} from "../handler";
import { IConfig } from "../../utils/config";

const aUserId = "aUserId" as NonEmptyString;
const aConfig = { INTERNAL_USER_ID: "internalUserId" } as IConfig;

describe("handleEmptyErrorResponse ", () => {
  test("should return a left with detail if the Option is none", async () => {
    const r = await handleEmptyErrorResponse("aValidUlid" as Ulid)(O.none)();

    expect(E.isLeft(r)).toBe(true);
    if (E.isLeft(r))
      expect(r.left.detail).toBe(
        "Configuration not found: Cannot find any configuration with configurationId: aValidUlid"
      );
  });
});

describe("getRCConfigurationHandler", () => {
  test("should return an IResponseSuccessJson if the model return a valid configuration and the userId match", async () => {
    findLastVersionMock.mockReturnValueOnce(
      TE.right(O.some(aRemoteContentConfiguration))
    );
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      userId: aUserId
    });
    expect(r.kind).toBe("IResponseSuccessJson");
  });

  test("should return an IResponseSuccessJson if the model return a valid configuration and the user-id is internal", async () => {
    findLastVersionMock.mockReturnValueOnce(
      TE.right(O.some(aRemoteContentConfiguration))
    );
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      userId: aUserId
    });
    expect(r.kind).toBe("IResponseSuccessJson");
  });

  test("should return an IResponseErrorForbiddenNotAuthorized if the model return a valid configuration but the userId is not internal or does not match", async () => {
    findLastVersionMock.mockReturnValueOnce(
      TE.right(O.some(aRemoteContentConfiguration))
    );
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      userId: "invalid" as NonEmptyString
    });
    expect(r.kind).toBe("IResponseErrorForbiddenNotAuthorized");
  });

  test("should return an IResponseErrorNotFound if the model return an empty Option", async () => {
    findLastVersionMock.mockReturnValueOnce(TE.right(O.none));
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      userId: aUserId
    });
    expect(r.kind).toBe("IResponseErrorNotFound");
    expect(r.detail).toBe(
      "Configuration not found: Cannot find any configuration with configurationId: aValidUlid"
    );
  });

  test("should return an IResponseErrorInternal if cosmos return an error", async () => {
    findLastVersionMock.mockReturnValueOnce(TE.left(O.none));
    const r = await getRCConfigurationHandler({
      rccModel: rccModelMock,
      config: aConfig
    })({
      configurationId: aRemoteContentConfiguration.configurationId,
      userId: aUserId
    });
    expect(r.kind).toBe("IResponseErrorInternal");
    expect(r.detail).toContain(
      "Internal server error: Something went wrong trying to retrieve the configuration"
    );
  });
});
