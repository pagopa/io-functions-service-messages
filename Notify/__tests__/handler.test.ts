import * as e from "express";
import { TelemetryClient } from "applicationinsights";

import * as TE from "fp-ts/TaskEither";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { NotificationInfo } from "../../generated/definitions/NotificationInfo";
import { NotificationTypeEnum } from "../../generated/definitions/NotificationType";
import { Notify, NotifyHandler } from "../handler";

import { mockReq, mockRes } from "../../__mocks__/express-types";
import {
  aFiscalCode,
  aRetrievedMessageWithContent,
  aRetrievedService
} from "../../__mocks__/models.mock";
import {
  ResponseErrorInternal,
  ResponseSuccessNoContent
} from "@pagopa/ts-commons/lib/responses";
import {
  MessageWithContentReader,
  ServiceReader,
  SessionStatusReader
} from "../readers";

const aValidMessageNotifyPayload: NotificationInfo = {
  notification_type: NotificationTypeEnum.MESSAGE,
  message_id: "aMessageId" as NonEmptyString,
  fiscal_code: aFiscalCode
};

const aValidReadReminderNotifyPayload: NotificationInfo = {
  notification_type: NotificationTypeEnum.REMINDER_READ,
  message_id: "aMessageId" as NonEmptyString,
  fiscal_code: aFiscalCode
};

const aMockedRequestWithRightParams = {
  ...mockReq(),
  body: {
    aValidNotifyPayload: aValidMessageNotifyPayload
  }
} as e.Request;

// -------------------------------------
// Mocks
// -------------------------------------

const userSessionReaderMock = jest.fn(
  fiscalCode => TE.of({ active: true }) as ReturnType<SessionStatusReader>
);

const messageReaderMock = jest.fn(
  (fiscalCode, messageId) =>
    TE.of({ ...aRetrievedMessageWithContent, id: messageId }) as ReturnType<
      MessageWithContentReader
    >
);

const serviceReaderMock = jest.fn(
  _ => TE.of(aRetrievedService) as ReturnType<ServiceReader>
);

const sendNotificationMock = jest.fn(_ => TE.of(void 0));

const getHandler = () =>
  NotifyHandler(
    userSessionReaderMock,
    messageReaderMock,
    serviceReaderMock,
    sendNotificationMock
  );

// -------------------------------------
// Tests
// -------------------------------------
describe("Notify Middlewares", () => {
  it("should return 400 if payload is not defined", async () => {
    const aRequestWithInvalidPayload = {
      ...aMockedRequestWithRightParams,
      body: {}
    } as e.Request;

    const notifyhandler = Notify(
      userSessionReaderMock,
      messageReaderMock,
      serviceReaderMock,
      sendNotificationMock,
      {} as TelemetryClient
    );

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
      body: { ...aValidMessageNotifyPayload, message_id: "" }
    } as e.Request;

    const notifyhandler = Notify(
      userSessionReaderMock,
      messageReaderMock,
      serviceReaderMock,
      sendNotificationMock,
      {} as TelemetryClient
    );

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

describe("Notify |> Reminder |> Success", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return Success if a Read Reminder is sent to allowed fiscal code with verbose notification", async () => {
    const notifyhandler = getHandler();

    const res = await notifyhandler(aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });
    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Leggi il messaggio da ${aRetrievedService.organizationName}`,
      aRetrievedMessageWithContent.content.subject
    );
  });

  it("should return Success if a Read Reminder is sent to allowed fiscal code with silent notification", async () => {
    userSessionReaderMock.mockImplementationOnce(_ => TE.of({ active: false }));

    const notifyhandler = getHandler();

    const res = await notifyhandler(aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });
    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Hai un messaggio non letto`,
      `Entra nell'app per leggerlo`
    );
  });

  it("should return Success if a Payment Reminder is sent to allowed fiscal code with verbose notification", async () => {
    const notifyhandler = getHandler();

    const res = await notifyhandler({
      ...aValidReadReminderNotifyPayload,
      notification_type: NotificationTypeEnum.REMINDER_PAYMENT
    });

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });

    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Hai un avviso da pagare`,
      `Entra nell’app e paga l’avviso emesso da ${aRetrievedService.organizationName}`
    );
  });

  it("should return Success if user session cannot be retrieved, sending a silent notification", async () => {
    userSessionReaderMock.mockImplementationOnce(_ =>
      TE.left(ResponseErrorInternal("an Error"))
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });

    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Hai un messaggio non letto`,
      `Entra nell'app per leggerlo`
    );
  });
});

describe("Notify |> Reminder |> Errors", () => {
  beforeEach(() => jest.clearAllMocks());

  // TODO: This will change in future
  it("should return NotAuthorized if a MESSAGE notification type is sent", async () => {
    const notifyhandler = getHandler();

    const res = await notifyhandler({
      ...aValidReadReminderNotifyPayload,
      notification_type: NotificationTypeEnum.MESSAGE
    });

    expect(res).toMatchObject({
      kind: "IResponseErrorForbiddenNotAuthorized",
      detail:
        "You are not allowed here: You're not allowed to send the notification"
    });
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("should return InternalError if message cannot be retrieved", async () => {
    messageReaderMock.mockImplementationOnce(_ =>
      TE.left(ResponseErrorInternal("an Error"))
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({
      kind: "IResponseErrorInternal",
      detail: "Internal server error: an Error"
    });
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("should return InternalError if service cannot be retrieved", async () => {
    serviceReaderMock.mockImplementationOnce(_ =>
      TE.left(ResponseErrorInternal("an Error"))
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({
      kind: "IResponseErrorInternal",
      detail: "Internal server error: an Error"
    });
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });
});
