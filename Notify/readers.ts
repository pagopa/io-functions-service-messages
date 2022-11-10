import { BlobService } from "azure-storage";
import { flow, pipe } from "fp-ts/lib/function";

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
  ProfileModel,
  RetrievedProfile
} from "@pagopa/io-functions-commons/dist/src/models/profile";

import {
  IResponseErrorInternal,
  IResponseErrorNotFound,
  ResponseErrorInternal,
  ResponseErrorNotFound
} from "@pagopa/ts-commons/lib/responses";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";

import { UserSessionInfo } from "../generated/session/UserSessionInfo";
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
    TE.mapLeft(_ =>
      ResponseErrorInternal("Error while retrieving the service")
    ),
    TE.chainW(
      TE.fromOption(() =>
        ResponseErrorNotFound(
          "Service not found",
          `Service ${serviceId} was not found in the system.`
        )
      )
    )
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
    TE.mapLeft(_ =>
      ResponseErrorInternal("Error while retrieving the message metadata")
    ),
    TE.chainW(
      TE.fromOption(() =>
        ResponseErrorNotFound(
          "Message not found",
          `Message ${messageId} was not found for the given Fiscal Code`
        )
      )
    )
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
    TE.mapLeft(_ =>
      ResponseErrorInternal("Error while retrieving the message")
    ),
    TE.chainW(
      TE.fromOption(() =>
        ResponseErrorNotFound(
          "Message content not found",
          `Content of message ${messageId} was not found for the given Fiscal Code`
        )
      )
    )
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
) => TE.TaskEither<IResponseErrorInternal, UserSessionInfo>;

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

// -----------------------------------------

export type UserProfileReader = (
  fiscalCode: FiscalCode
) => TE.TaskEither<
  IResponseErrorInternal | IResponseErrorNotFound,
  RetrievedProfile
>;

export const getUserProfileReader = (
  profileModel: ProfileModel
): UserProfileReader => (fiscalCode): ReturnType<UserProfileReader> =>
  pipe(
    profileModel.findLastVersionByModelId([fiscalCode]),
    TE.mapLeft(cosmosError =>
      ResponseErrorInternal(
        `Error while retrieving user profile from Cosmos DB - ${cosmosError.kind}`
      )
    ),
    TE.chainW(
      TE.fromOption(() =>
        ResponseErrorNotFound(
          "User profile not found",
          `User profile was not found for the given Fiscal Code`
        )
      )
    )
  );
