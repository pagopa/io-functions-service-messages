import * as E from "fp-ts/lib/Either";
import * as T from "fp-ts/lib/Task";
import { IRequestMiddleware } from "@pagopa/ts-commons/lib/request_middleware";
import {
  IResponse,
  ResponseErrorForbiddenAnonymousUser
} from "@pagopa/ts-commons/lib/responses";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/lib/function";

/**
 * A middleware that will extract the userId
 *
 * The middleware expects the header x-user-id
 */
export const RequiredUserIdMiddleware = (): IRequestMiddleware<
  "IResponseErrorForbiddenAnonymousUser",
  NonEmptyString
> => (
  request
): Promise<
  E.Either<IResponse<"IResponseErrorForbiddenAnonymousUser">, NonEmptyString>
> =>
  pipe(
    request.header("x-user-id"),
    NonEmptyString.decode,
    E.mapLeft(() => ResponseErrorForbiddenAnonymousUser),
    T.of
  )();
