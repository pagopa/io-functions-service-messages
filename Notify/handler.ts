import * as express from "express";

import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import { RequiredBodyPayloadMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  getResponseErrorForbiddenNotAuthorized,
  IResponseErrorForbiddenNotAuthorized,
  IResponseSuccessAccepted
} from "@pagopa/ts-commons/lib/responses";
import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import { NotificationInfo } from "../generated/definitions/NotificationInfo";

type NotifyHandler = () => Promise<
  IResponseSuccessAccepted | IResponseErrorForbiddenNotAuthorized
>;

export const NotifyHandler = (): NotifyHandler => async (): ReturnType<
  NotifyHandler
> => getResponseErrorForbiddenNotAuthorized("Not implemented");

export const Notify = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  telemetryClient: ReturnType<typeof initAppInsights>
): express.RequestHandler => {
  const handler = NotifyHandler();
  const middlewaresWrap = withRequestMiddlewares(
    RequiredBodyPayloadMiddleware(NotificationInfo)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};
