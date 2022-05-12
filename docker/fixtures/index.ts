/**
 * Insert fake data into CosmosDB database emulator.
 */
import { ContainerResponse, CosmosClient, Database } from "@azure/cosmos";
import {
  NewProfile,
  Profile,
  PROFILE_COLLECTION_NAME,
  ProfileModel
} from "@pagopa/io-functions-commons/dist/src/models/profile";
import {
  NewService,
  Service,
  SERVICE_COLLECTION_NAME,
  ServiceModel
} from "@pagopa/io-functions-commons/dist/src/models/service";

import * as A from "fp-ts/lib/Apply";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";

import { getConfigOrThrow } from "../../utils/config";

const config = getConfigOrThrow();

export const cosmosDbUri = config.COSMOSDB_URI;
export const cosmosDbKey = config.COSMOSDB_KEY;

export const cosmosdbClient = new CosmosClient({
  endpoint: cosmosDbUri,
  key: cosmosDbKey
});

function createDatabase(databaseName: string): TE.TaskEither<Error, Database> {
  return pipe(
    TE.tryCatch(
      () => cosmosdbClient.databases.create({ id: databaseName }),
      E.toError
    ),
    TE.map(_ => _.database)
  );
}

function createCollection(
  db: Database,
  collectionName: string,
  partitionKey: string
): TE.TaskEither<Error, ContainerResponse> {
  return TE.tryCatch(
    () => db.containers.createIfNotExists({ id: collectionName, partitionKey }),
    E.toError
  );
}

const aService: Service = pipe(
  Service.decode({
    authorizedCIDRs: [],
    authorizedRecipients: [],
    departmentName: "Deparment Name",
    isVisible: true,
    maxAllowedPaymentAmount: 100000,
    organizationFiscalCode: "01234567890",
    organizationName: "Organization name",
    requireSecureChannels: false,
    serviceId: config.REQ_SERVICE_ID,
    serviceName: "MyServiceName"
  }),
  E.getOrElseW(() => {
    throw new Error("Cannot decode service payload.");
  })
);

const aNewService = pipe(
  NewService.decode({
    ...aService,
    kind: "INewService"
  }),
  E.getOrElseW(() => {
    throw new Error("Cannot decode new service.");
  })
);

const aProfile: Profile = pipe(
  Profile.decode({
    acceptedTosVersion: 1,
    email: "email@example.com",
    fiscalCode: "AAAAAA00A00A000A",
    isEmailEnabled: true,
    isEmailValidated: true,
    isInboxEnabled: true,
    isWebhookEnabled: true
  }),
  E.getOrElseW(() => {
    throw new Error("Cannot decode profile payload.");
  })
);

const aNewProfile = pipe(
  NewProfile.decode({
    ...aProfile,
    kind: "INewProfile"
  }),
  E.getOrElseW(() => {
    throw new Error("Cannot decode new profile.");
  })
);

pipe(
  createDatabase(config.COSMOSDB_NAME),
  TE.chain(db =>
    pipe(
      A.sequenceT(TE.ApplicativeSeq)(
        createCollection(db, "message-status", "messageId"),
        createCollection(db, "messages", "fiscalCode"),
        createCollection(db, "notification-status", "notificationId"),
        createCollection(db, "notifications", "messageId"),
        createCollection(db, "profiles", "fiscalCode"),
        createCollection(db, "services", "serviceId")
      ),
      TE.map(_ => db)
    )
  ),
  TE.chain(db =>
    pipe(
      A.sequenceT(TE.ApplicativeSeq)(
        new ServiceModel(db.container(SERVICE_COLLECTION_NAME)).create(
          aNewService
        ),
        new ProfileModel(db.container(PROFILE_COLLECTION_NAME)).create(
          aNewProfile
        )
      ),
      TE.mapLeft(_ => new Error(`CosmosError: ${_.kind}`))
    )
  )
)().then(
  // eslint-disable-next-line no-console
  _ => console.log(`Successfully created fixtures`),
  // eslint-disable-next-line no-console
  _ => console.error(`Failed generate fixtures ${_.message}`)
);
