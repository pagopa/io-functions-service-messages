import * as E from "fp-ts/lib/Either";
import { IRequestMiddleware } from "@pagopa/ts-commons/lib/request_middleware";
import {
  IResponse,
  IResponseErrorForbiddenAnonymousUser,
  ResponseErrorForbiddenAnonymousUser
} from "@pagopa/ts-commons/lib/responses";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

/**
 * A middleware that will extract the userId
 *
 * The middleware expects the header x-user-id
 */
// TODO: refactor this miuddleware to be more functional
// TODO: refactor this miuddleware to be more functional
export const RequiredUserIdMiddleware = (): IRequestMiddleware<
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

    console.log(`request.header: ${request.header("x-user-id")}`);

    if (E.isLeft(errorOrUserId)) {
      console.log(`Left: ${errorOrUserId.left}`);
      return resolve(E.left(ResponseErrorForbiddenAnonymousUser));
    }

    console.log(`Right: ${errorOrUserId.right}`);

    const userId = errorOrUserId.right;
    resolve(
      E.right<IResponseErrorForbiddenAnonymousUser, NonEmptyString>(userId)
    );
  });
