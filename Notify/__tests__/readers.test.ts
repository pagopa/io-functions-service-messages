import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";

import {
  aFiscalCode,
  aMessageContent,
  aRetrievedMessage,
  aRetrievedMessageWithContent,
  aRetrievedService
} from "../../__mocks__/models.mock";

import {
  getMessageWithContent,
  getService,
  getUserSessionStatusReader
} from "../readers";
import {
  Service,
  ServiceModel
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { ErrorResponse } from "@azure/cosmos";
import { BlobService } from "azure-storage";
import { MessageModel } from "@pagopa/io-functions-commons/dist/src/models/message";
import { createClient } from "../../generated/session/client";

const findOneByServiceIdMock = jest.fn(
  () =>
    TE.of(O.some(aRetrievedService)) as ReturnType<
      ServiceModel["findLastVersionByModelId"]
    >
);

const serviceModelMock = ({
  findOneByServiceId: findOneByServiceIdMock
} as any) as ServiceModel;

const findMessageForRecipientMock = jest
  .fn()
  .mockImplementation(() => TE.of(O.some(aRetrievedMessage)));

const getContentFromBlobMock = jest
  .fn()
  .mockImplementation(() => TE.of(O.some(aMessageContent)));
const messageModelMock = ({
  findMessageForRecipient: findMessageForRecipientMock,
  getContentFromBlob: getContentFromBlobMock
} as any) as MessageModel;

const anActiveSession = { active: true };

const getSessionMock = jest
  .fn()
  .mockImplementation(async () =>
    E.right({ status: 200, header: [], value: anActiveSession })
  );

const sessionClientMock: ReturnType<typeof createClient> = {
  getSession: getSessionMock,
  lockUserSession: jest.fn(),
  unlockUserSession: jest.fn()
};

// -----------------------------
// Tests
// -----------------------------

describe("ServiceReader", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return the existing service", async () => {
    const serviceReader = getService(serviceModelMock);

    const result = await serviceReader(aRetrievedService.id)();
    expect(result).toEqual(E.right(aRetrievedService));
  });

  it("should return IResponseErrorNotFound if service does not exists", async () => {
    findOneByServiceIdMock.mockImplementationOnce(() => TE.of(O.none));
    const serviceReader = getService(serviceModelMock);

    const result = await serviceReader(aRetrievedService.id)();
    expect(result).toMatchObject(
      E.left({
        kind: "IResponseErrorNotFound",
        detail: `Service not found: Service ${aRetrievedService.id} was not found in the system.`
      })
    );
  });

  it("should return IResponseErrorInternal if an error occurred", async () => {
    findOneByServiceIdMock.mockImplementationOnce(() =>
      TE.left({ kind: "COSMOS_ERROR_RESPONSE", error: {} as ErrorResponse })
    );
    const serviceReader = getService(serviceModelMock);

    const result = await serviceReader(aRetrievedService.id)();
    expect(result).toMatchObject(
      E.left({
        kind: "IResponseErrorInternal",
        detail: `Internal server error: Error while retrieving the service`
      })
    );
  });
});

describe("MessageWithContentReader", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return the existing message with its content", async () => {
    const messageReader = getMessageWithContent(
      messageModelMock,
      {} as BlobService
    );

    const result = await messageReader(aFiscalCode, aRetrievedMessage.id)();
    expect(result).toEqual(E.right(aRetrievedMessageWithContent));
  });

  it("should return IResponseErrorNotFound if message metadata does not exists", async () => {
    findMessageForRecipientMock.mockImplementationOnce(() => TE.of(O.none));
    const messageReader = getMessageWithContent(
      messageModelMock,
      {} as BlobService
    );

    const result = await messageReader(aFiscalCode, aRetrievedMessage.id)();
    expect(result).toMatchObject(
      E.left({
        kind: "IResponseErrorNotFound",
        detail: `Message not found: Message ${aRetrievedMessage.id} was not found for the given Fiscal Code`
      })
    );
  });

  it("should return IResponseErrorNotFound if message content does not exists", async () => {
    getContentFromBlobMock.mockImplementationOnce(() => TE.of(O.none));
    const messageReader = getMessageWithContent(
      messageModelMock,
      {} as BlobService
    );

    const result = await messageReader(aFiscalCode, aRetrievedMessage.id)();
    expect(result).toMatchObject(
      E.left({
        kind: "IResponseErrorNotFound",
        detail: `Message content not found: Content of message ${aRetrievedMessage.id} was not found for the given Fiscal Code`
      })
    );
  });

  it("should return IResponseErrorInternal if an error occurred retrieving message metadata", async () => {
    findMessageForRecipientMock.mockImplementationOnce(() => TE.left({}));
    const messageReader = getMessageWithContent(
      messageModelMock,
      {} as BlobService
    );

    const result = await messageReader(aFiscalCode, aRetrievedMessage.id)();
    expect(result).toMatchObject(
      E.left({
        kind: "IResponseErrorInternal",
        detail: `Internal server error: Error while retrieving the message metadata`
      })
    );
  });

  it("should return IResponseErrorInternal if an error occurred retrieving message content", async () => {
    getContentFromBlobMock.mockImplementationOnce(() => TE.left({}));
    const messageReader = getMessageWithContent(
      messageModelMock,
      {} as BlobService
    );

    const result = await messageReader(aFiscalCode, aRetrievedMessage.id)();
    expect(result).toMatchObject(
      E.left({
        kind: "IResponseErrorInternal",
        detail: `Internal server error: Error while retrieving the message`
      })
    );
  });
});

describe("SessionStatusReader", () => {
  it("should return the existing user session status", async () => {
    const userSessionStatusReader = getUserSessionStatusReader(
      sessionClientMock
    );

    const result = await userSessionStatusReader(aFiscalCode)();
    expect(result).toEqual(E.right(anActiveSession));
  });

  it("should return IResponseErrorInternal if an error occurred", async () => {
    getSessionMock.mockImplementationOnce(async () => {
      throw Error("");
    });
    const userSessionStatusReader = getUserSessionStatusReader(
      sessionClientMock
    );

    const result = await userSessionStatusReader(aFiscalCode)();
    expect(result).toMatchObject(
      E.left({
        kind: "IResponseErrorInternal",
        detail: `Internal server error: Error retrieving user session`
      })
    );
  });

  it("should return IResponseErrorInternal if validation fails", async () => {
    getSessionMock.mockImplementationOnce(async () => E.left({}));
    const userSessionStatusReader = getUserSessionStatusReader(
      sessionClientMock
    );

    const result = await userSessionStatusReader(aFiscalCode)();
    expect(result).toMatchObject(
      E.left({
        kind: "IResponseErrorInternal",
        detail: `Internal server error: Error decoding user session`
      })
    );
  });

  it("should return IResponseErrorInternal if response status code is not 200", async () => {
    getSessionMock.mockImplementationOnce(async () =>
      E.right({ status: 400, header: [], value: {} })
    );
    const userSessionStatusReader = getUserSessionStatusReader(
      sessionClientMock
    );

    const result = await userSessionStatusReader(aFiscalCode)();
    expect(result).toMatchObject(
      E.left({
        kind: "IResponseErrorInternal",
        detail: `Internal server error: Error retrieving user session`
      })
    );
  });
});
