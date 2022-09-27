import { Context } from "@azure/functions";

export interface ILogger {
  /**
   * Logs an error string
   *
   * @param s an encoded error detail
   */
  readonly error: (s: string) => void;
  /**
   * Logs an info string
   *
   * @param s an info string
   */
  readonly info: (s: string) => void;
}

/**
 *
 * @param context
 * @param logPrefix
 * @returns
 */
export const createLogger = (context: Context, logPrefix: string): ILogger => ({
  error: (s: string): void => {
    context.log.error(`${logPrefix}|${s}`);
  },
  info: (s: string): void => {
    context.log.info(`${logPrefix}|${s}`);
  }
});
