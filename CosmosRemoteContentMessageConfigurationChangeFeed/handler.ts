import * as E from "fp-ts/lib/Either";
import { identity, pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import { RetrievedRCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import {
  UserRCConfiguration,
  UserRCConfigurationModel,
  RetrievedUserRCConfiguration
} from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { ILogger } from "../utils/logger";
import { errorsToError } from "../utils/conversions";

const logAndReturnError = (logger: ILogger) => (error: Error): Error => {
  logger.error(error.message);
  return error;
};

const bindRecords = (
  userRCConfigurationModel: UserRCConfigurationModel,
  documents: ReadonlyArray<unknown>,
  logger: ILogger,
  startTimeFilter: NonNegativeInteger
) =>
  pipe(
    documents,
    RA.map(RetrievedRCConfiguration.decode),
    RA.filter(E.isRight),
    RA.map(rcConfigurationEither => rcConfigurationEither.right),
    // eslint-disable-next-line no-underscore-dangle
    RA.filter(rcConfiguration => rcConfiguration._ts >= startTimeFilter),
    RA.map(rcConfiguration =>
      pipe(
        {
          id: rcConfiguration.configurationId,
          userId: rcConfiguration.userId
        },
        UserRCConfiguration.decode,
        E.map(newUserRCConfiguration =>
          pipe(
            userRCConfigurationModel.upsert(newUserRCConfiguration),
            TE.mapLeft(
              ce =>
                new Error(
                  `${ce.kind} | Cannot upsert the new UserRCConfiguration for configuration ${rcConfiguration.configurationId}`
                )
            )
          )
        ),
        E.mapLeft(errorsToError),
        E.mapLeft(logAndReturnError(logger)),
        TE.fromEither,
        TE.chainW(identity)
      )
    ),
    TE.sequenceArray
  )();

export const handler = (
  userRCConfigurationModel: UserRCConfigurationModel,
  logger: ILogger,
  startTimeFilter: NonNegativeInteger
) => async (documents: ReadonlyArray<unknown>): Promise<void> => {
  const processingResult = await bindRecords(
    userRCConfigurationModel,
    documents,
    logger,
    startTimeFilter
  );
  // we have to throws here to ensure that "retry" mechanism of Azure
  // can be executed
  if (processingResult instanceof Error) {
    throw processingResult;
  }
};
