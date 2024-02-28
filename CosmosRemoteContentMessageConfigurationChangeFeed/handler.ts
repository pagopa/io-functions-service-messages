import * as E from "fp-ts/lib/Either";
import { identity, pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import { RetrievedRCConfiguration } from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import {
  UserRCConfiguration,
  UserRCConfigurationModel,
  RetrievedUserRCConfiguration
} from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { ILogger } from "../utils/logger";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { errorsToError } from "../utils/conversions";

export const handler = (
  userRCConfigurationModel: UserRCConfigurationModel,
  logger: ILogger,
  startTimeFilter: NonNegativeInteger
) => (
  documents: ReadonlyArray<unknown>
): Promise<Error | ReadonlyArray<RetrievedUserRCConfiguration>> =>
  pipe(
    documents,
    RA.map(RetrievedRCConfiguration.decode),
    RA.filter(E.isRight),
    RA.map(rcConfigurationEither => rcConfigurationEither.right),
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
            TE.mapLeft(error => {
              const errorMessage = `${error.kind} | Cannot upsert the new UserRCConfiguration for configuration ${rcConfiguration.configurationId}`;
              logger.error(errorMessage);
              return new Error(errorMessage);
            })
          )
        ),
        E.mapLeft(errorsToError),
        TE.fromEither,
        TE.chainW(identity)
      )
    ),
    TE.sequenceArray,
    TE.toUnion
  )();
