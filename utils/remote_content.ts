import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import {
  IResponseErrorForbiddenNotAuthorized,
  ResponseErrorForbiddenNotAuthorized
} from "@pagopa/ts-commons/lib/responses";
import { manageSubscriptionCheck } from "./apim";

export const ALLOWED_RC_CONFIG_API_GROUP = "ApiRemoteContentConfigurationWrite";

export const checkGroupAndManageSubscription = (
  subscriptionId: NonEmptyString,
  userGroups: NonEmptyString
): TE.TaskEither<IResponseErrorForbiddenNotAuthorized, boolean> =>
  pipe(
    manageSubscriptionCheck(subscriptionId),
    TE.fromPredicate(
      isManageSubscription =>
        isManageSubscription &&
        userGroups.indexOf(ALLOWED_RC_CONFIG_API_GROUP) > -1,
      _ => ResponseErrorForbiddenNotAuthorized
    )
  );
