/* eslint-disable sort-keys */
import { IPrintersForTemplate } from "../printer";
import { YOU_HAVE_A_NEW_MESSAGE, OPEN_THE_APP_TO_READ_IT } from "./constant";

export const messagePrinter: IPrintersForTemplate = {
  silentPushPrinter: _ne => ({
    title: YOU_HAVE_A_NEW_MESSAGE,
    body: OPEN_THE_APP_TO_READ_IT
  }),

  verbosePushPrinter: ne => ({
    title: `${ne.organizationName}`,
    body: ne.title
  })
};
