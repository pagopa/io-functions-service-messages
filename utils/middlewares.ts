import * as E from "fp-ts/lib/Either";
import * as T from "fp-ts/lib/Task";
import { IRequestMiddleware } from "@pagopa/ts-commons/lib/request_middleware";
import {
  IResponse,
  IResponseErrorForbiddenAnonymousUser,
  ResponseErrorForbiddenAnonymousUser
} from "@pagopa/ts-commons/lib/responses";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/lib/function";

/**
 * A middleware that will extract the userId
 *
 * The middleware expects the header x-user-id
 */
// TODO: refactor this middleware to be more functional
// TODO: refactor this middleware to be generic
export const RequiredUserIdMiddleware1 = (): IRequestMiddleware<
  "IResponseErrorForbiddenAnonymousUser",
  NonEmptyString
> => (
  request
): Promise<
  E.Either<IResponse<"IResponseErrorForbiddenAnonymousUser">, NonEmptyString>
> =>
  new Promise(resolve => {
    // get Azure userId from the headers
    const errorOrUserId = NonEmptyString.decode(request.header("x-user-id"));

    if (E.isLeft(errorOrUserId)) {
      return resolve(E.left(ResponseErrorForbiddenAnonymousUser));
    }

    const userId = errorOrUserId.right;
    resolve(
      E.right<IResponseErrorForbiddenAnonymousUser, NonEmptyString>(userId)
    );
  });

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
