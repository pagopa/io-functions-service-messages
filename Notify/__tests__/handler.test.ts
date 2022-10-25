import * as e from "express";
import { TelemetryClient } from "applicationinsights";

import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { NotificationInfo } from "../../generated/definitions/NotificationInfo";
import { NotificationTypeEnum } from "../../generated/definitions/NotificationType";
import { Notify, NotifyHandler } from "../handler";

import { mockReq, mockRes } from "../../__mocks__/express-types";
import {
  aFiscalCode,
  aRetrievedMessageWithContent,
  aRetrievedProfile,
  aRetrievedService
} from "../../__mocks__/models.mock";
import { ResponseErrorInternal } from "@pagopa/ts-commons/lib/responses";
import {
  MessageWithContentReader,
  ServiceReader,
  SessionStatusReader,
  UserProfileReader
} from "../readers";
import { SendNotification } from "../notification";
import { UserGroup } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_api_auth";
import { Context } from "@azure/functions";
import { toHash } from "../../utils/crypto";
import { ReminderStatusEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ReminderStatus";

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

const isBetaTesterMock = jest.fn(_ => true);

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

const userProfileReaderMock = jest.fn(
  _ =>
    TE.of({
      ...aRetrievedProfile,
      reminderStatus: ReminderStatusEnum.ENABLED
    }) as ReturnType<UserProfileReader>
);

const sendNotificationMock = jest.fn(
  _ => TE.of(void 0) as ReturnType<SendNotification>
);

const mockContext = {} as Context;
const mockContextMiddleware = jest.fn(async () => E.of(mockContext));

const context_middleware = require("@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware");
jest
  .spyOn(context_middleware, "ContextMiddleware")
  .mockReturnValue(mockContextMiddleware);

const logger = {
  info: s => console.log(`Notify|${s}`),
  error: s => console.log(`Notify|${s}`),
  warning: s => console.log(`Notify|${s}`),
  trackEvent: jest.fn(e => {
    return void 0;
  })
};

const getHandler = () =>
  NotifyHandler(
    isBetaTesterMock,
    userProfileReaderMock,
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
      isBetaTesterMock,
      userProfileReaderMock,
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
      isBetaTesterMock,
      userProfileReaderMock,
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

  it.each([
    {
      notification_type: NotificationTypeEnum.MESSAGE,
      x_user_groups: UserGroup.ApiMessageRead
    },
    {
      notification_type: NotificationTypeEnum.REMINDER_PAYMENT,
      x_user_groups: UserGroup.ApiMessageRead
    },
    {
      notification_type: NotificationTypeEnum.REMINDER_PAYMENT_LAST,
      x_user_groups: UserGroup.ApiMessageRead
    },
    {
      notification_type: NotificationTypeEnum.REMINDER_READ,
      x_user_groups: UserGroup.ApiMessageRead
    }
  ])(
    "should return 403 if user groups are not corrects",
    async ({ notification_type, x_user_groups }) => {
      const aRequestWithNotAllowedPayload = {
        ...aMockedRequestWithRightParams,
        body: {
          ...aValidMessageNotifyPayload,
          notification_type: notification_type
        },
        header: name =>
          new Map<string, string>([["x-user-groups", x_user_groups]]).get(name)
      } as e.Request;

      const notifyhandler = Notify(
        isBetaTesterMock,
        userProfileReaderMock,
        userSessionReaderMock,
        messageReaderMock,
        serviceReaderMock,
        sendNotificationMock,
        {} as TelemetryClient
      );

      const res = mockRes();
      await notifyhandler(
        aRequestWithNotAllowedPayload,
        (res as any) as e.Response,
        {} as e.NextFunction
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 403,
          title: "You are not allowed here",
          detail: `No valid scopes, you are not allowed to send such payloads. Ask the administrator to give you the required permissions.`
        })
      );
    }
  );
});

describe("Notify |> Reminder |> Success", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return Success if a Read Reminder is sent to allowed fiscal code with verbose notification", async () => {
    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });
    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Leggi il messaggio da ${aRetrievedService.organizationName}`,
      aRetrievedMessageWithContent.content.subject
    );
    expect(logger.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "send-notification.info",
        properties: {
          hashedFiscalCode: toHash(
            aValidReadReminderNotifyPayload.fiscal_code
          ) as NonEmptyString,
          messageId: aValidReadReminderNotifyPayload.message_id,
          notificationType: aValidReadReminderNotifyPayload.notification_type,
          verbose: true,
          userSessionRetrieved: true
        }
      })
    );
  });

  it("should return Success if a Read Reminder is sent to allowed fiscal code with silent notification", async () => {
    userSessionReaderMock.mockImplementationOnce(_ => TE.of({ active: false }));

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });
    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Hai un messaggio non letto`,
      `Entra nell'app per leggerlo`
    );
    expect(logger.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "send-notification.info",
        properties: {
          hashedFiscalCode: toHash(
            aValidReadReminderNotifyPayload.fiscal_code
          ) as NonEmptyString,
          messageId: aValidReadReminderNotifyPayload.message_id,
          notificationType: aValidReadReminderNotifyPayload.notification_type,
          verbose: false,
          userSessionRetrieved: true
        }
      })
    );
  });

  it("should return Success if a Read Reminder is sent to allowed fiscal code with silent notification when service is privacy critical", async () => {
    serviceReaderMock.mockImplementationOnce(_ =>
      TE.of({ ...aRetrievedService, requireSecureChannels: true })
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });
    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Hai un messaggio non letto`,
      `Entra nell'app per leggerlo`
    );
    expect(logger.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "send-notification.info",
        properties: {
          hashedFiscalCode: toHash(
            aValidReadReminderNotifyPayload.fiscal_code
          ) as NonEmptyString,
          messageId: aValidReadReminderNotifyPayload.message_id,
          notificationType: aValidReadReminderNotifyPayload.notification_type,
          verbose: false,
          userSessionRetrieved: true
        }
      })
    );
  });

  it("should return Success if a Payment Reminder is sent to allowed fiscal code with verbose notification", async () => {
    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, {
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
    expect(logger.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "send-notification.info",
        properties: {
          hashedFiscalCode: toHash(
            aValidReadReminderNotifyPayload.fiscal_code
          ) as NonEmptyString,
          messageId: aValidReadReminderNotifyPayload.message_id,
          notificationType: NotificationTypeEnum.REMINDER_PAYMENT,
          verbose: true,
          userSessionRetrieved: true
        }
      })
    );
  });

  it("should return Success if user session cannot be retrieved, sending a silent notification", async () => {
    userSessionReaderMock.mockImplementationOnce(_ =>
      TE.left(ResponseErrorInternal("an Error"))
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({ kind: "IResponseSuccessNoContent" });

    expect(sendNotificationMock).toHaveBeenCalledWith(
      aFiscalCode,
      aValidReadReminderNotifyPayload.message_id,
      `Hai un messaggio non letto`,
      `Entra nell'app per leggerlo`
    );
    expect(logger.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "send-notification.info",
        properties: {
          hashedFiscalCode: toHash(
            aValidReadReminderNotifyPayload.fiscal_code
          ) as NonEmptyString,
          messageId: aValidReadReminderNotifyPayload.message_id,
          notificationType: aValidReadReminderNotifyPayload.notification_type,
          verbose: false,
          userSessionRetrieved: false
        }
      })
    );
  });

  it.each([
    {
      notification_type: NotificationTypeEnum.REMINDER_PAYMENT,
      x_user_groups: UserGroup.ApiReminderNotify
    },
    {
      notification_type: NotificationTypeEnum.REMINDER_PAYMENT_LAST,
      x_user_groups: UserGroup.ApiReminderNotify
    },
    {
      notification_type: NotificationTypeEnum.REMINDER_READ,
      x_user_groups: UserGroup.ApiReminderNotify
    }
  ])(
    "should return 204 with the correct user groups",
    async ({ notification_type, x_user_groups }) => {
      const aRequestWithNotAllowedPayload = {
        ...aMockedRequestWithRightParams,
        body: {
          ...aValidMessageNotifyPayload,
          notification_type: notification_type
        },
        header: name =>
          new Map<string, string>([["x-user-groups", x_user_groups]]).get(name)
      } as e.Request;

      const notifyhandler = Notify(
        isBetaTesterMock,
        userProfileReaderMock,
        userSessionReaderMock,
        messageReaderMock,
        serviceReaderMock,
        sendNotificationMock,
        {
          trackEvent: _ => {
            return void 0;
          }
        } as TelemetryClient
      );

      const res = mockRes();
      await notifyhandler(
        aRequestWithNotAllowedPayload,
        (res as any) as e.Response,
        {} as e.NextFunction
      );

      expect(res.status).toHaveBeenCalledWith(204);
    }
  );
});

describe("Notify |> Reminder |> Errors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  // TODO: This will change in future
  it("should return NotAuthorized if a MESSAGE notification type is sent", async () => {
    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, {
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

  it("should return NotAuthorized if user has not enabled reminder notification", async () => {
    userProfileReaderMock.mockImplementationOnce(_ => TE.of(aRetrievedProfile));

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({
      kind: "IResponseErrorForbiddenNotAuthorized",
      detail:
        "You are not allowed here: You're not allowed to send the notification"
    });
    expect(userProfileReaderMock).toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("should return InternalError if user's profile cannot be retrieved", async () => {
    userProfileReaderMock.mockImplementationOnce(_ =>
      TE.left(ResponseErrorInternal("an Error"))
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({
      kind: "IResponseErrorInternal",
      detail: "Internal server error: Error checking user preferences"
    });
    expect(userProfileReaderMock).toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("should return InternalError if message cannot be retrieved", async () => {
    messageReaderMock.mockImplementationOnce(_ =>
      TE.left(ResponseErrorInternal("an Error"))
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

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

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({
      kind: "IResponseErrorInternal",
      detail: "Internal server error: an Error"
    });
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("should return InternalError if sendNotification fails", async () => {
    sendNotificationMock.mockImplementationOnce(_ =>
      TE.left(Error("a Queue Error"))
    );

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({
      kind: "IResponseErrorInternal",
      detail: "Internal server error: Error while sending notification to queue"
    });
  });

  // TODO: Remove after e2e tests
  it("should return IResponseErrorForbiddenNotAuthorized if user is not a beta tester", async () => {
    isBetaTesterMock.mockImplementationOnce(_ => {
      console.log("CI SONO", _);
      return false;
    });

    const notifyhandler = getHandler();

    const res = await notifyhandler(logger, aValidReadReminderNotifyPayload);

    expect(res).toMatchObject({
      kind: "IResponseErrorForbiddenNotAuthorized",
      detail:
        "You are not allowed here: You're not allowed to send the notification"
    });
  });
});
