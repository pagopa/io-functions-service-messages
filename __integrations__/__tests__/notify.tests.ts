import { delay } from "fp-ts/lib/Task";
import nodeFetch from "node-fetch";
import { exit } from "process";

import { WAIT_MS, SHOW_LOGS } from "../env";
import { getNodeFetch } from "../utils/fetch";

console.log("ENV: ", WAIT_MS, SHOW_LOGS);

const MAX_ATTEMPT = 50;
jest.setTimeout(WAIT_MS * MAX_ATTEMPT);

const baseUrl = "http://function:7071";

const customHeaders = {};

// Wait some time
beforeAll(async () => {
  let i = 0;
  while (i < MAX_ATTEMPT) {
    console.log("Waiting the function to setup..");
    try {
      await nodeFetch(`${baseUrl}/api/info`);
      break;
    } catch (e) {
      await delay(WAIT_MS);
      i++;
    }
  }
  if (i >= MAX_ATTEMPT) {
    console.log("Function unable to setup in time");
    exit(1);
  }
});

beforeEach(() => jest.clearAllMocks());

describe("Notify |> Middleware errors", () => {
  it("should return 400 when payload is not defined", async () => {
    const nodeFetch = getNodeFetch({}, SHOW_LOGS);

    const body = {};
    const response = await postNotify(nodeFetch)(body);

    expect(response.status).toEqual(400);
  });
});

// -----------
// Utils
// -----------

const postNotify = (nodeFetch: typeof fetch) => async body => {
  return await nodeFetch(`${baseUrl}/api/v1/notify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body.message)
  });
};
