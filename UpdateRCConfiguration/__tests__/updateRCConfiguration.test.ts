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
    expect(E.isLeft(r)).toBe(true);
  });

  test("should return a right if the userId is equal to the userId of the configuration", async () => {
    const r = await isUserAllowedToUpdateConfiguration(
      aRemoteContentConfiguration.userId
    )(aRemoteContentConfiguration)();
    expect(E.isRight(r)).toBe(true);
  });
});

describe("handleEmptyConfiguration", () => {
  test("should return a left if the configuration was not found", async () => {
    expect(E.isLeft(await handleEmptyConfiguration(O.none)())).toBeTruthy();
  });

  test("should return a right if the configuration was found", async () => {
    expect(
      E.isRight(
        await handleEmptyConfiguration(O.some(aRemoteContentConfiguration))()
      )
    ).toBe(true);
  });
});

describe("handleGetLastRCConfigurationVersion", () => {
  test("should return a left if the find return an error", async () => {
    findLastVersionMock.mockReturnValueOnce(TE.left({}));
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
    findLastVersionMock.mockReturnValueOnce(
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
  test("should return a left if the upsert method fail", async () => {
    upsertConfigurationMock.mockReturnValueOnce(TE.left({}));
    const r = await handleUpsert(rccModelMock)(aRemoteContentConfiguration)();
    expect(E.isLeft(r)).toBe(true);
    if (E.isLeft(r))
      expect(r.left.detail).toContain(
        `Something went wrong trying to upsert the configuration: `
      );
  });

  test("should return a right if the upsert method goes well", async () => {
    upsertConfigurationMock.mockReturnValueOnce(TE.right({}));
    const r = await handleUpsert(rccModelMock)(aRemoteContentConfiguration)();
    expect(E.isRight(r)).toBe(true);
    if (E.isRight(r)) expect(r.right.kind).toBe("IResponseSuccessNoContent");
  });
});
