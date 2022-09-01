/* eslint-disable sort-keys */
import { IPrintersForTemplate } from "../printer";
import {
  OPEN_THE_APP_TO_PAY_IT,
  YOU_HAVE_A_NOTICE_EXPIRING_TOMORROW
} from "./constant";

export const reminderPaymentLastPrinter: IPrintersForTemplate = {
  silentPushPrinter: _ne => ({
    title: YOU_HAVE_A_NOTICE_EXPIRING_TOMORROW,
    body: OPEN_THE_APP_TO_PAY_IT
  }),

  verbosePushPrinter: ne => ({
    title: YOU_HAVE_A_NOTICE_EXPIRING_TOMORROW,
    body: `Entra nell’app e paga l’avviso emesso da ${ne.organizationName}`
  })
};
