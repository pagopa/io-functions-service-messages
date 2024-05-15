import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

export const MANAGE_SUBSCRIPTION_PREFIX = "MANAGE-";

export const manageSubscriptionCheck = (
  subscriptionId: NonEmptyString
): boolean => subscriptionId.startsWith(MANAGE_SUBSCRIPTION_PREFIX);
