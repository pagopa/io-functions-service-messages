import * as e from "express";
import { TelemetryClient } from "applicationinsights";

import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { NotificationInfo } from "../../generated/definitions/NotificationInfo";
import { NotificationTypeEnum } from "../../generated/definitions/NotificationType";
import { Notify } from "../handler";

import { mockReq, mockRes } from "../../__mocks__/express-types";

const aFiscalNumber = "GRBGPP87L04L741X" as FiscalCode;
const aValidNotifyPayload: NotificationInfo = {
  notification_type: NotificationTypeEnum.MESSAGE,
  message_id: "aMessageId" as NonEmptyString,
  fiscal_code: aFiscalNumber
};

const aMockedRequestWithRightParams = {
  ...mockReq(),
  body: {
    aValidNotifyPayload
  }
} as e.Request;

describe("Notify Middlewares", () => {
  it("should return 400 if payload is not defined", async () => {
    const aRequestWithInvalidPayload = {
      ...aMockedRequestWithRightParams,
      body: {}
    } as e.Request;

    const notifyhandler = Notify({} as TelemetryClient);

    const res = mockRes();
    await notifyhandler(
      aRequestWithInvalidPayload,
      (res as any) as e.Response,
      {} as e.NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        title: "Invalid NotificationInfo",
        detail: `value [undefined] at [root.0.notification_type] is not a valid [NotificationType]\nvalue [undefined] at [root.0.fiscal_code] is not a valid [string that matches the pattern \"^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$\"]\nvalue [undefined] at [root.0.message_id] is not a valid [non empty string]`
      })
    );
  });

  it("should return 400 if payload is not correct", async () => {
    const aRequestWithInvalidPayload = {
      ...aMockedRequestWithRightParams,
      body: { ...aValidNotifyPayload, message_id: "" }
    } as e.Request;

    const notifyhandler = Notify({} as TelemetryClient);

    const res = mockRes();
    await notifyhandler(
      aRequestWithInvalidPayload,
      (res as any) as e.Response,
      {} as e.NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        title: "Invalid NotificationInfo",
        detail: `value [\"\"] at [root.0.message_id] is not a valid [non empty string]`
      })
    );
  });
});
