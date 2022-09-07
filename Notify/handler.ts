import * as express from "express";

import { identity, pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";

import { match } from "ts-pattern";

import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  getResponseErrorForbiddenNotAuthorized,
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessNoContent,
  ResponseErrorInternal,
  ResponseSuccessNoContent
} from "@pagopa/ts-commons/lib/responses";
import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { NotificationInfo } from "../generated/definitions/NotificationInfo";
import {
  NotificationType,
  NotificationTypeEnum
} from "../generated/definitions/NotificationType";

import {
  getPrinterForTemplate,
  NotificationPrinter
} from "../templates/printer";

import { SendNotification } from "./notification";
import {
  MessageWithContentReader,
  ServiceReader,
  SessionStatusReader
} from "./readers";

const isReminderNotification = (notificationType: NotificationType): boolean =>
  [
    NotificationTypeEnum.REMINDER_PAYMENT,
    NotificationTypeEnum.REMINDER_PAYMENT_LAST,
    NotificationTypeEnum.REMINDER_READ
  ].includes(notificationType);

/**
 * Check whether a Reminder notification can be sent to user or not
 * NOTE: Right now we got no opt-in check. Always return true
 *
 * @param fiscalCode The user Fiscal Code
 * @returns
 */
const canSendReminderNotification = (
  _fiscalCode: FiscalCode
): TE.TaskEither<Error, boolean> => TE.right(true);

/**
 * Check whether a notification can be sent to user
 *
 * @param notificationType
 * @param fiscalCode
 * @returns a TaskEither of Error or boolean
 */
const checkSendNotificationPermission = (
  notificationType: NotificationType,
  fiscalCode: FiscalCode
): TE.TaskEither<Error, boolean> =>
  match(notificationType)
    .when(isReminderNotification, _ => canSendReminderNotification(fiscalCode))
    // Not implemented yet
    .otherwise(_ => TE.of(false));

/**
 * Check whether a notification should not contain personal information
 * depending on user' session status
 *
 * @param notificationType
 * @param fiscalCode
 * @returns a TaskEither of Error or boolean
 */
const canSendVerboseNotification = (
  retrieveUserSession: SessionStatusReader,
  fiscalCode: FiscalCode
): TE.TaskEither<Error, boolean> =>
  pipe(
    retrieveUserSession(fiscalCode),
    TE.mapLeft(_ => Error("Error checking user session")),
    TE.map(sessionStatus => sessionStatus.active)
  );

const prepareNotification = (
  retrieveUserSession: SessionStatusReader,
  retrieveMessageWithContent: MessageWithContentReader,
  retrieveService: ServiceReader
) => (
  notification_type: NotificationTypeEnum,
  fiscal_code,
  message_id
): TE.TaskEither<
  IResponseErrorInternal | IResponseErrorNotFound,
  NotificationPrinter
> =>
  pipe(
    canSendVerboseNotification(retrieveUserSession, fiscal_code),
    TE.orElse(_err => TE.of(false)),
    TE.bindTo("sendVerboseNotification"),
    TE.bindW("messageWithContent", () =>
      retrieveMessageWithContent(fiscal_code, message_id)
    ),
    TE.bindW("service", ({ messageWithContent }) =>
      retrieveService(messageWithContent.senderServiceId)
    ),
    TE.map(({ sendVerboseNotification, messageWithContent, service }) => ({
      notificationEntry: {
        organizationName: service.organizationName,
        serviceName: service.serviceName,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore Ignore error: an IWithinRangeStringTag<10, 121> is an NonEmptyString for sure
        title: messageWithContent.content.subject as NonEmptyString
      },
      printer: getPrinterForTemplate(notification_type),
      sendVerboseNotification
    })),
    TE.map(({ sendVerboseNotification, printer, notificationEntry }) =>
      sendVerboseNotification
        ? printer.verbosePushPrinter(notificationEntry)
        : printer.silentPushPrinter(notificationEntry)
    )
  );

// -------------------------------------
// NotifyHandler
// -------------------------------------

type NotifyHandler = (
  notificationInfo: NotificationInfo
) => Promise<
  | IResponseSuccessNoContent
  | IResponseErrorInternal
  | IResponseErrorNotFound
  | IResponseErrorForbiddenNotAuthorized
>;

export const NotifyHandler = (
  retrieveUserSession: SessionStatusReader,
  retrieveMessageWithContent: MessageWithContentReader,
  retrieveService: ServiceReader,
  sendNotification: SendNotification
): NotifyHandler => async ({
  fiscal_code,
  message_id,
  notification_type
}): ReturnType<NotifyHandler> =>
  pipe(
    checkSendNotificationPermission(notification_type, fiscal_code),
    TE.mapLeft(_ => ResponseErrorInternal("Error checking user preferences")),
    TE.chainW(
      TE.fromPredicate(identity, () =>
        getResponseErrorForbiddenNotAuthorized(
          "You're not allowed to send the notification"
        )
      )
    ),
    TE.chainW(_ =>
      prepareNotification(
        retrieveUserSession,
        retrieveMessageWithContent,
        retrieveService
      )(notification_type, fiscal_code, message_id)
    ),
    TE.chainW(({ body, title }) =>
      pipe(
        sendNotification(fiscal_code, message_id, title, body),
        TE.mapLeft(_err =>
          ResponseErrorInternal("Error while sending notification to queue")
        )
      )
    ),
    TE.map(_ => ResponseSuccessNoContent()),
    TE.toUnion
  )();

export const Notify = (
  retrieveUserSession: SessionStatusReader,
  retrieveMessageWithContent: MessageWithContentReader,
  retrieveService: ServiceReader,
  sendNotification: SendNotification,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  telemetryClient: ReturnType<typeof initAppInsights>
): express.RequestHandler => {
  const handler = NotifyHandler(
    retrieveUserSession,
    retrieveMessageWithContent,
    retrieveService,
    sendNotification
  );
  const middlewaresWrap = withRequestMiddlewares(
    RequiredBodyPayloadMiddleware(NotificationInfo)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};
