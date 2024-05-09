import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";

import {
  aRemoteContentConfiguration,
  aUserRCCList,
  allConfigurations,
  findAllByUserId,
  findAllByConfigurationId,
  rccModelMock,
  userRCCModelMock
} from "../../__mocks__/remote-content";

import {
  listRCConfigurationHandler
} from "../handler";
import { IConfig } from "../../utils/config";
import { RetrievedUserRCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { RetrievedRCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration_non_versioned_temp";

const aUserId = "aUserId" as NonEmptyString;
const aConfig = { INTERNAL_USER_ID: "internalUserId" } as IConfig;

describe("listRCConfigurationHandler", () => {
  test("should return an IResponseSuccessJson if the model return a valid configuration and the userId match", async () => {
    findAllByUserId.mockReturnValueOnce(
      TE.right(aUserRCCList)
    );
    findAllByConfigurationId.mockReturnValueOnce(
      TE.right(allConfigurations)
    );

    const r = await listRCConfigurationHandler({
      rcConfigurationModel: rccModelMock,
      userRCConfigurationModel: userRCCModelMock
    })({
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
      userId: aRemoteContentConfiguration.userId
    });
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
      userId: aRemoteContentConfiguration.userId
    });
    expect(r.kind).toBe("IResponseErrorInternal");
    expect(r.detail).toContain(
      "Internal server error: Something went wrong trying to retrieve the configurations"
    );
  });
});
