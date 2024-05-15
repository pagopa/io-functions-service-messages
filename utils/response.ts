import { CosmosErrors } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import {
  IResponseErrorInternal,
  ResponseErrorInternal
} from "@pagopa/ts-commons/lib/responses";

export const handleCosmosErrorResponse = (message: string) => (
  error: CosmosErrors
): IResponseErrorInternal =>
  ResponseErrorInternal(`${message}: ${JSON.stringify(error)}`);
