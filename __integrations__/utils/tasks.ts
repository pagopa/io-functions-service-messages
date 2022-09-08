import { exit } from "process";
import { log } from "./logger";

/**
 * Wait for `ms` milliseconds
 * @param ms milliseconds to wait
 * @returns a promise to wait
 */
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wait function to setup, using info endpoint as check
 * @param maxAttempt
 * @param delayTime
 * @param infoEndpoint
 */
export const waitFunctionToSetup = async (
  maxAttempt: number,
  delayTime: number,
  infoEndpoint: string,
  nodeFetch: typeof fetch
): Promise<void> => {
  // eslint-disable-next-line functional/no-let
  let i = 0;

  log(`Fetching ${infoEndpoint}`);
  while (i < maxAttempt) {
    try {
      await nodeFetch(infoEndpoint);
      break;
    } catch (e) {
      log(`Function not ready.`);
      await delay(delayTime);
      i++;
    }
  }
  if (i >= maxAttempt) {
    log("Function unable to setup in time");
    exit(1);
  }
};
