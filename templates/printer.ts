/* eslint-disable @typescript-eslint/naming-convention */
import * as t from "io-ts";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import {
  NotificationType,
  NotificationTypeEnum
} from "../generated/definitions/NotificationType";
import { messagePrinter } from "./makdown/message";
import { reminderReadPrinter } from "./makdown/reminderRead";
import { reminderPaymentPrinter } from "./makdown/reminderPayment";
import { reminderPaymentLastPrinter } from "./makdown/reminderPaymentLast";

export const NotificationEntry = t.interface({
  organizationName: NonEmptyString,
  serviceName: NonEmptyString,
  title: NonEmptyString
});
export type NotificationEntry = t.TypeOf<typeof NotificationEntry>;

interface NotificationPrinter {
  readonly title: string;
  readonly body: string;
}

export interface IPrintersForTemplate {
  readonly silentPushPrinter: (v: NotificationEntry) => NotificationPrinter;
  readonly verbosePushPrinter: (v: NotificationEntry) => NotificationPrinter;
}

const printersConfigurations: {
  [key in NotificationType]: IPrintersForTemplate;
} = {
  [NotificationTypeEnum.MESSAGE]: messagePrinter,
  [NotificationTypeEnum.REMINDER_READ]: reminderReadPrinter,
  [NotificationTypeEnum.REMINDER_PAYMENT]: reminderPaymentPrinter,
  [NotificationTypeEnum.REMINDER_PAYMENT_LAST]: reminderPaymentLastPrinter
};

export const getPrinterForTemplate = (
  notificationType: NotificationType
): IPrintersForTemplate => printersConfigurations[notificationType];
