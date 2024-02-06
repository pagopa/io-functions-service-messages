import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";

import {
  aNewRemoteContentConfiguration,
  aRemoteContentConfiguration,
  aUserId,
  createNewConfigurationMock,
  rccModelMock
} from "../../__mocks__/remote-content";
import { ulidGenerator } from "@pagopa/io-functions-commons/dist/src/utils/strings";
import {
  createRCConfigurationHandler,
  getNewRCConfigurationWithConfigurationId
} from "../handler";
import { RCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { Ulid } from "@pagopa/ts-commons/lib/strings";

describe("getNewRCConfigurationWithConfigurationId", () => {
  test("should return a valid RCConfiguration", () => {
    const r = RCConfiguration.decode(
      getNewRCConfigurationWithConfigurationId(
        ulidGenerator,
        aUserId
      )(aNewRemoteContentConfiguration)
    );
    expect(E.isRight(r)).toBeTruthy();
    if (E.isRight(r))
      expect(E.isRight(Ulid.decode(r.right.configurationId))).toBeTruthy();
  });
});

describe("createRCConfigurationHandler", () => {
  test("should return 500 if the model return an error", async () => {
    createNewConfigurationMock.mockReturnValueOnce(TE.left({}));
    const r = await createRCConfigurationHandler({
      rccModel: rccModelMock,
      generateConfigurationId: ulidGenerator
    })({
      newRCConfiguration: {
        ...aNewRemoteContentConfiguration
      },
      userId: aUserId
    });

    expect(r.kind).toBe("IResponseErrorInternal");
    expect(r.detail).toBe(
      "Internal server error: Error creating the new configuration: undefined"
    );
  });

  test("should return 201 with the ulid if the create goes fine", async () => {
    createNewConfigurationMock.mockReturnValueOnce(
      TE.right(aRemoteContentConfiguration)
    );
    const r = await createRCConfigurationHandler({
      rccModel: rccModelMock,
      generateConfigurationId: ulidGenerator
    })({ newRCConfiguration: aNewRemoteContentConfiguration, userId: aUserId });

    expect(r.kind).toBe("IResponseSuccessRedirectToResource");
    if (r.kind === "IResponseSuccessRedirectToResource")
      expect(r.payload).toMatchObject({
        id: aRemoteContentConfiguration.configurationId
      });
  });
});
