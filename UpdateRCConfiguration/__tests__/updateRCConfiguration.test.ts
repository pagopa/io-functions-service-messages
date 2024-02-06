import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";

import {
  handleEmptyConfiguration,
  handleGetLastRCConfigurationVersion,
  handleUpsert,
  isUserAllowedToUpdateConfiguration
} from "../handler";
import {
  aRemoteContentConfiguration,
  findLastVersionMock,
  rccModelMock,
  upsertConfigurationMock
} from "../../__mocks__/remote-content";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

describe("isUserAllowedToUpdateConfiguration", () => {
  test("should return a left if the userId is not equal to the userId of the configuration", async () => {
    const r = await isUserAllowedToUpdateConfiguration(
      "aDifferentUserId" as NonEmptyString
    )(aRemoteContentConfiguration)();
    expect(E.isLeft(r)).toBeTruthy();
  });

  test("should return a right if the userId is equal to the userId of the configuration", async () => {
    const r = await isUserAllowedToUpdateConfiguration(
      aRemoteContentConfiguration.userId
    )(aRemoteContentConfiguration)();
    expect(E.isRight(r)).toBeTruthy();
  });
});

describe("handleEmptyConfiguration", () => {
  test("shoult return a left if the configuration was not found", async () => {
    expect(E.isLeft(await handleEmptyConfiguration(O.none)())).toBeTruthy();
  });

  test("shoult return a right if the configuration was found", async () => {
    expect(
      E.isRight(
        await handleEmptyConfiguration(O.some(aRemoteContentConfiguration))()
      )
    ).toBeTruthy();
  });
});

describe("handleGetLastRCConfigurationVersion", () => {
  test("shoult return a left if the find return an error", async () => {
    findLastVersionMock.mockReturnValueOnce(TE.left({}));
    const rccModel = rccModelMock;
    const r = await handleGetLastRCConfigurationVersion(
      rccModel,
      aRemoteContentConfiguration.configurationId
    )();
    expect(E.isLeft(r)).toBeTruthy();
    if (E.isLeft(r))
      expect(r.left.detail).toContain(
        "Something went wrong trying to retrieve the configuration: "
      );
  });

  test("shoult return a right if the find return a right", async () => {
    findLastVersionMock.mockReturnValueOnce(TE.right(O.some({})));
    const r = await handleGetLastRCConfigurationVersion(
      rccModelMock,
      aRemoteContentConfiguration.configurationId
    )();
    expect(E.isRight(r)).toBeTruthy();
    expect(E.isRight(r)).toBeTruthy();
  });
});

describe("handleUpsert", () => {
  test("shoult return a left if the upsert method fail", async () => {
    upsertConfigurationMock.mockReturnValueOnce(TE.left({}));
    const r = await handleUpsert(rccModelMock)(aRemoteContentConfiguration)();
    expect(E.isLeft(r)).toBeTruthy();
    if (E.isLeft(r))
      expect(r.left.detail).toContain(
        `Something went wrong trying to upsert the configuration: `
      );
  });

  test("shoult return a right if the upsert method goes well", async () => {
    upsertConfigurationMock.mockReturnValueOnce(TE.right({}));
    const r = await handleUpsert(rccModelMock)(aRemoteContentConfiguration)();
    expect(E.isRight(r)).toBeTruthy();
    if (E.isRight(r)) expect(r.right.kind).toBe("IResponseSuccessNoContent");
  });
});
