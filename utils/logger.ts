import * as t from "io-ts";

import { Context } from "@azure/functions";
import { TelemetryClient } from "applicationinsights";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { NotificationType } from "../generated/definitions/NotificationType";

export const NotificationInfoEvent = t.type({
  name: t.literal("send-notification.info"),
  properties: t.intersection([
    t.type({
      hashedFiscalCode: NonEmptyString,
      messageId: NonEmptyString,
      notificationType: NotificationType,
      verbose: t.boolean
    }),
    t.partial({
      switchedToAnonymous: t.boolean
    })
  ])
});

export const BusinessEvent = NotificationInfoEvent;
export type BusinessEvent = t.TypeOf<typeof BusinessEvent>;

export interface ILogger {
  /**
   * Logs an error string
   *
   * @param s an encoded error detail
   */
  readonly error: (s: string) => void;
  /**
   * Logs a warning string
   *
   * @param s an info string
   */
  readonly warning: (s: string) => void;
  /**
   * Logs an info string
   *
   * @param s an info string
   */
  readonly info: (s: string) => void;
  /**
   * Logs an info string
   *
   * @param s an info string
   */
  readonly trackEvent: (e: BusinessEvent) => void;
}

/**
 *
 * @param context
 * @param logPrefix
 * @returns
 */
export const createLogger = (
  context: Context,
  telemetryClient: TelemetryClient,
  logPrefix: string
): ILogger => ({
  error: (s: string): void => {
    context.log.error(`${logPrefix}|${s}`);
  },
  info: (s: string): void => {
    context.log.info(`${logPrefix}|${s}`);
  },
  trackEvent: (e): void => {
    telemetryClient.trackEvent({
      name: e.name,
      properties: e.properties,
      tagOverrides: { samplingEnabled: "false" }
    });
  },
  warning: (s: string): void => {
    context.log.warn(`${logPrefix}|${s}`);
  }
});
