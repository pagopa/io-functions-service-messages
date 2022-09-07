import { QueueClient } from "@azure/storage-queue";

import * as TE from "fp-ts/TaskEither";

import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/lib/function";
import {
  KindEnum as NotifyKind,
  NotifyMessage
} from "../generated/notifications/NotifyMessage";
import { NotificationMessageKindEnum } from "../generated/notifications/NotificationMessageKind";
import { toHash } from "../utils/crypto";

export const base64EncodeObject = (_: unknown): string =>
  Buffer.from(JSON.stringify(_)).toString("base64");

export type SendNotification = (
  fiscalCode: FiscalCode,
  messageId: NonEmptyString,
  notificationTitle: string,
  notificationBody: string
) => TE.TaskEither<Error, void>;

/**
 *
 * @param notificationQueueClient
 * @returns
 */
export const sendNotification = (
  notificationQueueClient: QueueClient
): SendNotification => (
  fiscalCode,
  messageId,
  notificationTitle,
  notificationBody
): ReturnType<SendNotification> =>
  pipe(
    {
      installationId: toHash(fiscalCode) as NonEmptyString,
      kind: NotifyKind[NotificationMessageKindEnum.Notify],
      payload: {
        message: notificationBody,
        message_id: messageId,
        title: notificationTitle
      }
    },
    (notifyMessage: NotifyMessage) =>
      TE.tryCatch(
        () =>
          notificationQueueClient.sendMessage(
            base64EncodeObject(notifyMessage)
          ),
        (error: { readonly message?: string }) =>
          Error(
            `Error while sending notify message to the queue [${error.message}]`
          )
      ),
    TE.map(_ => void 0)
  );
