import * as express from "express";

import { identity, pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

import { match } from "ts-pattern";

import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  AzureAllowBodyPayloadMiddleware,
  UserGroup
} from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_api_auth";
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
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import { ReminderStatusEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ReminderStatus";
import { NotificationInfo } from "../generated/definitions/NotificationInfo";
import {
  NotificationType,
  NotificationTypeEnum
} from "../generated/definitions/NotificationType";

import {
  getPrinterForTemplate,
  NotificationPrinter
} from "../templates/printer";

import { IsBetaTester } from "../utils/tests";
import { createLogger, ILogger } from "../utils/logger";
import { toHash } from "../utils/crypto";

import { SendNotification } from "./notification";
import {
  MessageWithContentReader,
  ServiceReader,
  SessionStatusReader,
  UserProfileReader
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
  retrieveUserProfile: UserProfileReader
) => (fiscalCode: FiscalCode): TE.TaskEither<Error, boolean> =>
  pipe(
    retrieveUserProfile(fiscalCode),
    TE.mapLeft(err => Error(err.detail)),
    // reminder is allowed only if user has explicitly enabled it
    TE.map(profile => profile.reminderStatus === ReminderStatusEnum.ENABLED)
  );

/**
 * Check whether a notification can be sent to user
 *
 * @param notificationType
 * @param fiscalCode
 * @returns a TaskEither of Error or boolean
 */
const checkSendNotificationPermission = (
  isBetaTester: IsBetaTester,
  retrieveUserProfile: UserProfileReader
) => (
  notificationType: NotificationType,
  fiscalCode: FiscalCode
): TE.TaskEither<Error, boolean> =>
  match(notificationType)
    .when(isReminderNotification, _ =>
      isBetaTester(fiscalCode)
        ? canSendReminderNotification(retrieveUserProfile)(fiscalCode)
        : TE.of(false)
    )
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
  logger: ILogger,
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
    TE.map(sendVerboseNotification => ({
      sendVerboseNotification,
      switchedToAnonymous: false
    })),
    TE.orElse(_err => {
      logger.warning(`Error retrieving user session, switch to anonymous`);
      return TE.of({
        sendVerboseNotification: false,
        switchedToAnonymous: true
      });
    }),
    TE.bindW("messageWithContent", () =>
      pipe(
        retrieveMessageWithContent(fiscal_code, message_id),
        TE.mapLeft(response => {
          logger.error(
            `Error retrieving message with content|${response.detail}`
          );
          return response;
        })
      )
    ),
    TE.bindW("service", ({ messageWithContent }) =>
      pipe(
        retrieveService(messageWithContent.senderServiceId),
        TE.mapLeft(response => {
          logger.error(`Error retrieving service|${response.detail}`);
          return response;
        })
      )
    ),
    TE.map(data => ({
      ...data,
      sendVerboseNotification:
        data.sendVerboseNotification && !data.service.requireSecureChannels
    })),
    TE.map(data =>
      pipe(
        {
          hashedFiscalCode: toHash(fiscal_code) as NonEmptyString,
          messageId: message_id,
          notificationType: notification_type,
          switchedToAnonymous: data.switchedToAnonymous,
          verbose: data.sendVerboseNotification
        },
        properties =>
          logger.trackEvent({
            name: "send-notification.info",
            properties
          }),
        () => data
      )
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
  logger: ILogger,
  notificationInfo: NotificationInfo
) => Promise<
  | IResponseSuccessNoContent
  | IResponseErrorInternal
  | IResponseErrorNotFound
  | IResponseErrorForbiddenNotAuthorized
>;

const MessageNotificationInfo = t.interface({
  notification_type: t.literal(NotificationTypeEnum.MESSAGE)
});

const ReminderNotificationInfo = t.interface({
  notification_type: t.union([
    t.literal(NotificationTypeEnum.REMINDER_PAYMENT),
    t.literal(NotificationTypeEnum.REMINDER_PAYMENT_LAST),
    t.literal(NotificationTypeEnum.REMINDER_READ)
  ])
});

export const NotifyHandler = (
  isBetaTester: IsBetaTester,
  retrieveUserProfile: UserProfileReader,
  retrieveUserSession: SessionStatusReader,
  retrieveMessageWithContent: MessageWithContentReader,
  retrieveService: ServiceReader,
  sendNotification: SendNotification
  // eslint-disable-next-line max-params
): NotifyHandler => async (
  logger,
  { fiscal_code, message_id, notification_type }
): ReturnType<NotifyHandler> =>
  pipe(
    checkSendNotificationPermission(isBetaTester, retrieveUserProfile)(
      notification_type,
      fiscal_code
    ),
    TE.mapLeft(errorMsg => {
      logger.error(`Error checking user preferences|${errorMsg}`);
      return ResponseErrorInternal("Error checking user preferences");
    }),
    TE.chainW(
      TE.fromPredicate(identity, () => {
        logger.error(`Service is not allowed to send notification to user`);
        return getResponseErrorForbiddenNotAuthorized(
          "You're not allowed to send the notification"
        );
      })
    ),
    TE.chainW(_ =>
      prepareNotification(
        logger,
        retrieveUserSession,
        retrieveMessageWithContent,
        retrieveService
      )(notification_type, fiscal_code, message_id)
    ),
    TE.chainW(({ body, title }) =>
      pipe(
        sendNotification(fiscal_code, message_id, title, body),
        TE.mapLeft(err => {
          logger.error(`Error while sending notification to queue|${err}`);
          return ResponseErrorInternal(
            "Error while sending notification to queue"
          );
        })
      )
    ),
    TE.map(_ => ResponseSuccessNoContent()),
    TE.toUnion
  )();

export const Notify = (
  isBetaTester: IsBetaTester,
  retrieveUserProfile: UserProfileReader,
  retrieveUserSession: SessionStatusReader,
  retrieveMessageWithContent: MessageWithContentReader,
  retrieveService: ServiceReader,
  sendNotification: SendNotification,
  telemetryClient: ReturnType<typeof initAppInsights>
  // eslint-disable-next-line max-params
): express.RequestHandler => {
  const handler = NotifyHandler(
    isBetaTester,
    retrieveUserProfile,
    retrieveUserSession,
    retrieveMessageWithContent,
    retrieveService,
    sendNotification
  );
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(NotificationInfo),
    AzureAllowBodyPayloadMiddleware(
      MessageNotificationInfo,
      new Set([UserGroup.ApiNewMessageNotify])
    ),
    AzureAllowBodyPayloadMiddleware(
      ReminderNotificationInfo,
      new Set([UserGroup.ApiReminderNotify])
    )
  );
  return wrapRequestHandler(
    middlewaresWrap((context, _) =>
      handler(createLogger(context, telemetryClient, "Notify"), _)
    )
  );
};
