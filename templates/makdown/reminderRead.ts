/* eslint-disable sort-keys */
import { IPrintersForTemplate } from "../printer";
import {
  YOU_HAVE_AN_UNREAD_MESSAGE,
  OPEN_THE_APP_TO_READ_IT
} from "./constant";

export const reminderReadPrinter: IPrintersForTemplate = {
  silentPushPrinter: _ne => ({
    title: YOU_HAVE_AN_UNREAD_MESSAGE,
    body: OPEN_THE_APP_TO_READ_IT
  }),

  verbosePushPrinter: ne => ({
    title: `Leggi il messaggio da ${ne.organizationName}`,
    body: ne.title
  })
};
