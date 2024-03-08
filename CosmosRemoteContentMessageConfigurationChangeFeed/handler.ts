import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import { RetrievedRCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import {
  UserRCConfiguration,
  UserRCConfigurationModel
} from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { ILogger } from "../utils/logger";
import { errorsToError } from "../utils/conversions";

/**
 * This function cycles over the RetrievedRCConfiguration records sent by change feed processor
 * try to decode them and make a UserRCConfiguration to upsert.
 *
 * Any error is returned to be thrown in the handler to allow the functions retry mechanism to trigger.
 *
 * @param userRCConfigurationModel
 * @param documents
 * @param logger
 * @param startTimeFilter
 */
const processRecords = async (
  userRCConfigurationModel: UserRCConfigurationModel,
  documents: ReadonlyArray<unknown>,
  startTimeFilter: NonNegativeInteger
): Promise<Error | void> => {
  for (const doc of documents) {
    // check if docs sent by change feed are valid RetrievedRCConfiguration
    const retrievedRCConfigurationOrError = RetrievedRCConfiguration.decode(
      doc
    );
    if (E.isLeft(retrievedRCConfigurationOrError)) {
      return errorsToError(retrievedRCConfigurationOrError.left);
    }

    // skip older docs
    const retrievedRCConfiguration = retrievedRCConfigurationOrError.right;
    // eslint-disable-next-line no-underscore-dangle
    if (retrievedRCConfiguration._ts < startTimeFilter) {
      continue;
    }

    // make a new UserRCConfiguration and check it's valid
    const userRCConfigurationOrError = UserRCConfiguration.decode({
      id: retrievedRCConfiguration.configurationId,
      userId: retrievedRCConfiguration.userId
    });
    if (E.isLeft(userRCConfigurationOrError)) {
      return errorsToError(userRCConfigurationOrError.left);
    }

    // upsert UserRCConfiguration and return any error
    const userRCConfiguration = userRCConfigurationOrError.right;
    const upsertResult = await pipe(
      userRCConfigurationModel.upsert(userRCConfiguration),
      TE.mapLeft(
        ce =>
          new Error(
            `${ce.kind} | Cannot upsert the new UserRCConfiguration for configuration ${userRCConfiguration}`
          )
      )
    )();
    if (E.isLeft(upsertResult)) {
      return upsertResult.left;
    }
  }
};

export const handler = (
  userRCConfigurationModel: UserRCConfigurationModel,
  logger: ILogger,
  startTimeFilter: NonNegativeInteger
) => async (documents: ReadonlyArray<unknown>): Promise<void> => {
  const result = await processRecords(
    userRCConfigurationModel,
    documents,
    startTimeFilter
  );
  // throw error to ensure retry mechanism will work
  if (result instanceof Error) {
    logger.error(result.message);
    throw result;
  }
};
