import { getPrinterForTemplate } from "../printer";
import { NotificationTypeEnum } from "../../generated/definitions/NotificationType";
import { messagePrinter } from "../makdown/message";
import { reminderReadPrinter } from "../makdown/reminderRead";
import { reminderPaymentPrinter } from "../makdown/reminderPayment";
import { reminderPaymentLastPrinter } from "../makdown/reminderPaymentLast";

describe("Printer", () => {
  it.each([
    {
      notification: NotificationTypeEnum.MESSAGE,
      printer: messagePrinter
    },
    {
      notification: NotificationTypeEnum.REMINDER_READ,
      printer: reminderReadPrinter
    },
    {
      notification: NotificationTypeEnum.REMINDER_PAYMENT,
      printer: reminderPaymentPrinter
    },
    {
      notification: NotificationTypeEnum.REMINDER_PAYMENT_LAST,
      printer: reminderPaymentLastPrinter
    }
  ])("returns printer: $printer", async ({ notification, printer }) => {
    const result = getPrinterForTemplate(notification);
    expect(result).toBe(printer);
  });
});
