import { BlobService } from "azure-storage";
import { flow, identity, pipe } from "fp-ts/lib/function";

import * as TE from "fp-ts/TaskEither";
import * as AP from "fp-ts/lib/Apply";

import { match } from "ts-pattern";

import {
  RetrievedService,
  ServiceModel
} from "@pagopa/io-functions-commons/dist/src/models/service";

import {
  RetrievedMessage,
  MessageModel,
  RetrievedMessageWithContent
} from "@pagopa/io-functions-commons/dist/src/models/message";

import {
  IResponseErrorInternal,
  IResponseErrorNotFound,
  ResponseErrorInternal,
  ResponseErrorNotFound
} from "@pagopa/ts-commons/lib/responses";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { CosmosErrors } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";

import { UserSession as UserSessionStatus } from "../generated/session/UserSession";
import { Client as SessionClient } from "../generated/session/client";

export type ServiceReader = (
  serviceId: ServiceId
) => TE.TaskEither<
  IResponseErrorNotFound | IResponseErrorInternal,
  RetrievedService
>;
export const getService = (serviceModel: ServiceModel): ServiceReader => (
  serviceId
): ReturnType<ServiceReader> =>
  pipe(
    serviceModel.findOneByServiceId(serviceId),
    TE.mapLeft<CosmosErrors, IResponseErrorNotFound | IResponseErrorInternal>(
      _ => ResponseErrorInternal("Error while retrieving the service")
    ),
    TE.chainOptionK(() =>
      ResponseErrorNotFound(
        "Service not found",
        `Service ${serviceId} was not found in the system.`
      )
    )(identity)
  );

const getMessageMetadata = (messageModel: MessageModel) => (
  fiscalCode: FiscalCode,
  messageId: NonEmptyString
): TE.TaskEither<
  IResponseErrorInternal | IResponseErrorNotFound,
  RetrievedMessage
> =>
  pipe(
    messageModel.findMessageForRecipient(fiscalCode, messageId),
    TE.mapLeft<CosmosErrors, IResponseErrorNotFound | IResponseErrorInternal>(
      _ => ResponseErrorInternal("Error while retrieving the message")
    ),
    TE.chainOptionK(() =>
      ResponseErrorNotFound(
        "Message not found",
        `Message ${messageId} was not found for the given Fiscal Code`
      )
    )(identity)
  );

const getMessageContent = (
  messageModel: MessageModel,
  blobService: BlobService
) => (
  messageId: NonEmptyString
): TE.TaskEither<
  IResponseErrorInternal | IResponseErrorNotFound,
  MessageContent
> =>
  pipe(
    messageModel.getContentFromBlob(blobService, messageId),
    TE.mapLeft<Error, IResponseErrorInternal | IResponseErrorNotFound>(_ =>
      ResponseErrorInternal("Error while retrieving the message")
    ),
    TE.chainOptionK(() =>
      ResponseErrorNotFound(
        "Message content not found",
        `Content of message ${messageId} was not found for the given Fiscal Code`
      )
    )(identity)
  );

export type MessageWithContentReader = (
  fiscalCode: FiscalCode,
  messageId: NonEmptyString
) => TE.TaskEither<
  IResponseErrorInternal | IResponseErrorNotFound,
  RetrievedMessageWithContent
>;
/**
 * Retrieve a message with content
 * Return an IResponseError_ otherwise
 */
export const getMessageWithContent = (
  messageModel: MessageModel,
  blobService: BlobService
): MessageWithContentReader => (
  fiscalCode,
  messageId
): ReturnType<MessageWithContentReader> =>
  pipe(
    {
      content: getMessageContent(messageModel, blobService)(messageId),
      metadata: getMessageMetadata(messageModel)(fiscalCode, messageId)
    },
    AP.sequenceS(TE.ApplicativePar),
    TE.map(({ metadata, content }) => ({
      ...metadata,
      content,
      kind: "IRetrievedMessageWithContent"
    }))
  );

export type SessionStatusReader = (
  fiscalCode: FiscalCode
) => TE.TaskEither<IResponseErrorInternal, UserSessionStatus>;

export const getUserSessionStatusReader = (
  sessionClient: SessionClient<"token">
): SessionStatusReader => (fiscalCode): ReturnType<SessionStatusReader> =>
  pipe(
    TE.tryCatch(
      async () => sessionClient.getSession({ fiscalcode: fiscalCode }),
      _ => ResponseErrorInternal("Error retrieving user session")
    ),
    TE.chainW(
      flow(
        TE.fromEither,
        TE.mapLeft(_ => ResponseErrorInternal("Error decoding user session"))
      )
    ),
    TE.chainW(response =>
      match(response)
        .with({ status: 200 }, res => TE.of(res.value))
        .otherwise(_ =>
          TE.left(ResponseErrorInternal("Error retrieving user session"))
        )
    )
  );
