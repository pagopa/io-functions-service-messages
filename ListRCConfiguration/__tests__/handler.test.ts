import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";

import {
  aRemoteContentConfiguration,
  aUserRCCList,
  allConfigurations,
  findAllByUserId,
  findAllByConfigurationId,
  rccModelMock,
  userRCCModelMock,
  aManageSubscriptionId,
  aSubscriptionId,
  someUserGroupsWithTheAllowedOne,
  someUserGroups
} from "../../__mocks__/remote-content";

import { listRCConfigurationHandler } from "../handler";
import { RetrievedUserRCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { RetrievedRCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";

describe("listRCConfigurationHandler", () => {
  test("should return an IResponseSuccessJson if the model return a valid configuration and the userId match", async () => {
    findAllByUserId.mockReturnValueOnce(TE.right(aUserRCCList));
    findAllByConfigurationId.mockReturnValueOnce(TE.right(allConfigurations));

    const r = await listRCConfigurationHandler({
      rcConfigurationModel: rccModelMock,
      userRCConfigurationModel: userRCCModelMock
    })({
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aRemoteContentConfiguration.userId
    });
    expect(r.kind).toBe("IResponseSuccessJson");
    if (r.kind === "IResponseSuccessJson") {
      expect(r.value.rcConfigList).toHaveLength(2);
    }
  });

  test("should return an IResponseSuccessJson with an empty response if the userId does not have any configurations", async () => {
    findAllByUserId.mockReturnValueOnce(
      TE.right([] as ReadonlyArray<RetrievedUserRCConfiguration>)
    );
    findAllByConfigurationId.mockReturnValueOnce(
      TE.right([] as ReadonlyArray<RetrievedRCConfiguration>)
    );
    const r = await listRCConfigurationHandler({
      rcConfigurationModel: rccModelMock,
      userRCConfigurationModel: userRCCModelMock
    })({
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aRemoteContentConfiguration.userId
    });
    console.log(r.detail);
    expect(r.kind).toBe("IResponseSuccessJson");
    if (r.kind === "IResponseSuccessJson") {
      expect(r.value.rcConfigList).toHaveLength(0);
    }
  });

  test("should return an IResponseErrorInternal if cosmos return an error", async () => {
    findAllByUserId.mockReturnValueOnce(TE.left(O.none));
    const r = await listRCConfigurationHandler({
      rcConfigurationModel: rccModelMock,
      userRCConfigurationModel: userRCCModelMock
    })({
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aRemoteContentConfiguration.userId
    });
    expect(r.kind).toBe("IResponseErrorInternal");
    expect(r.detail).toContain(
      "Internal server error: Something went wrong trying to retrieve the user's configurations"
    );
  });

  test("should return an IResponseErrorForbiddenNotAuthorized if not called from a manage subscription", async () => {
    findAllByUserId.mockReturnValueOnce(
      TE.right([] as ReadonlyArray<RetrievedUserRCConfiguration>)
    );
    findAllByConfigurationId.mockReturnValueOnce(
      TE.right([] as ReadonlyArray<RetrievedRCConfiguration>)
    );
    const r = await listRCConfigurationHandler({
      rcConfigurationModel: rccModelMock,
      userRCConfigurationModel: userRCCModelMock
    })({
      subscriptionId: aSubscriptionId,
      userGroups: someUserGroupsWithTheAllowedOne,
      userId: aRemoteContentConfiguration.userId
    });
    expect(r.kind).toBe("IResponseErrorForbiddenNotAuthorized");
  });

  test("should return an IResponseErrorForbiddenNotAuthorized if user is not in the allowed group", async () => {
    findAllByUserId.mockReturnValueOnce(
      TE.right([] as ReadonlyArray<RetrievedUserRCConfiguration>)
    );
    findAllByConfigurationId.mockReturnValueOnce(
      TE.right([] as ReadonlyArray<RetrievedRCConfiguration>)
    );
    const r = await listRCConfigurationHandler({
      rcConfigurationModel: rccModelMock,
      userRCConfigurationModel: userRCCModelMock
    })({
      subscriptionId: aManageSubscriptionId,
      userGroups: someUserGroups,
      userId: aRemoteContentConfiguration.userId
    });
    expect(r.kind).toBe("IResponseErrorForbiddenNotAuthorized");
  });
});
