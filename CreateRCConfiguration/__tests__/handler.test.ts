import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";

import {
  aManageSubscriptionId,
  aPublicRemoteContentConfiguration,
  aRemoteContentConfiguration,
  aSubscriptionId,
  aUserId,
  createNewConfigurationMock,
  rccModelMock,
  someUserGroups,
  someUserGroupsWithTheAllowedOne
} from "../../__mocks__/remote-content";
import { ulidGeneratorAsUlid } from "@pagopa/io-functions-commons/dist/src/utils/strings";
import { createRCConfigurationHandler } from "../handler";
import { RCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { Ulid } from "@pagopa/ts-commons/lib/strings";
import { makeNewRCConfigurationWithConfigurationId } from "../../utils/mappers";

describe("makeNewRCConfigurationWithConfigurationId", () => {
  test("should return a valid RCConfiguration", () => {
    const r = RCConfiguration.decode(
      makeNewRCConfigurationWithConfigurationId(
        ulidGeneratorAsUlid,
        aUserId,
        aPublicRemoteContentConfiguration
      )
    );
    expect(E.isRight(r)).toBeTruthy();
    if (E.isRight(r))
      expect(E.isRight(Ulid.decode(r.right.configurationId))).toBeTruthy();
  });
});

describe("createRCConfigurationHandler", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  test("should return 500 if the model return an error", async () => {
    createNewConfigurationMock.mockReturnValueOnce(TE.left({}));
    const r = await createRCConfigurationHandler({
      rccModel: rccModelMock,
      generateConfigurationId: ulidGeneratorAsUlid
    })({
      newRCConfiguration: {
        ...aPublicRemoteContentConfiguration
      },
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aUserId
    });

    expect(r.kind).toBe("IResponseErrorInternal");
    expect(r.detail).toBe(
      "Internal server error: Something went wrong trying to create the configuration: {}"
    );
  });

  test("should return 201 with the ulid if the create goes fine", async () => {
    createNewConfigurationMock.mockReturnValueOnce(
      TE.right(aRemoteContentConfiguration)
    );
    const r = await createRCConfigurationHandler({
      rccModel: rccModelMock,
      generateConfigurationId: ulidGeneratorAsUlid
    })({
      newRCConfiguration: aPublicRemoteContentConfiguration,
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aUserId
    });

    expect(r.kind).toBe("IResponseSuccessRedirectToResource");
    if (r.kind === "IResponseSuccessRedirectToResource")
      expect(r.payload).toMatchObject({
        ...aPublicRemoteContentConfiguration
      });
  });

  test("should return 403 if group is not allowed", async () => {
    createNewConfigurationMock.mockReturnValueOnce(TE.left({}));
    const r = await createRCConfigurationHandler({
      rccModel: rccModelMock,
      generateConfigurationId: ulidGeneratorAsUlid
    })({
      newRCConfiguration: aPublicRemoteContentConfiguration,
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroups,
      userId: aUserId
    });

    expect(r.kind).toBe("IResponseErrorForbiddenNotAuthorized");
    expect(createNewConfigurationMock).not.toHaveBeenCalled();
  });

  test("should return 403 if subscription is not manage", async () => {
    createNewConfigurationMock.mockReturnValueOnce(TE.left({}));
    const r = await createRCConfigurationHandler({
      rccModel: rccModelMock,
      generateConfigurationId: ulidGeneratorAsUlid
    })({
      newRCConfiguration: aPublicRemoteContentConfiguration,
      subscriptionId: aSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aUserId
    });

    expect(r.kind).toBe("IResponseErrorForbiddenNotAuthorized");
    expect(createNewConfigurationMock).not.toHaveBeenCalled();
  });
});
