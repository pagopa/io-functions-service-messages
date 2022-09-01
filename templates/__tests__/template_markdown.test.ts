import { getOrElseW } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

import { NotificationEntry } from "../printer";

import { messagePrinter } from "../makdown/message";
import { reminderReadPrinter } from "../makdown/reminderRead";
import { reminderPaymentPrinter } from "../makdown/reminderPayment";
import { reminderPaymentLastPrinter } from "../makdown/reminderPaymentLast";

const notificationMessage = {
  organizationName: "TEST ORG",
  serviceName: "TEST SERVICE",
  title: "TEST OBJECT"
};

describe.each([
  { test: "MESSAGE", printer: messagePrinter },
  { test: "REMINDER_READ", printer: reminderReadPrinter },
  { test: "REMINDER_PAYMENT", printer: reminderPaymentPrinter },
  { test: "REMINDER_PAYMENT_LAST", printer: reminderPaymentLastPrinter }
])(`Printer - Template - %s`, ({ printer }) => {
  it("should print a silent notification", () => {
    const notification = pipe(
      NotificationEntry.decode(notificationMessage),
      getOrElseW(_ => {
        throw "Error decoding object";
      })
    );

    const result = printer.silentPushPrinter(notification);
    expect(result).toMatchSnapshot();
  });

  it("should print da verbose notification", () => {
    const notification = pipe(
      NotificationEntry.decode(notificationMessage),
      getOrElseW(_ => {
        throw "Error decoding object";
      })
    );

    const result = printer.verbosePushPrinter(notification);
    expect(result).toMatchSnapshot();
  });
});
