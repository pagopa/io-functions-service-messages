export const AzureWebJobsStorage = process.env.AzureWebJobsStorage;
export const QueueStorageConnection = process.env.QueueStorageConnection || "";

// Milliseconds to wait for test completion
export const WAIT_MS = Number(process.env.WAIT_MS ?? 5000);
export const SHOW_LOGS = process.env.SHOW_LOGS === "true";

export const COSMOSDB_URI = process.env.COSMOSDB_URI;
export const COSMOSDB_KEY = process.env.COSMOSDB_KEY;
export const COSMOSDB_NAME = process.env.COSMOSDB_NAME ?? "db";

export const REMOTE_CONTENT_COSMOSDB_URI =
  process.env.REMOTE_CONTENT_COSMOSDB_URI;
export const REMOTE_CONTENT_COSMOSDB_KEY =
  process.env.REMOTE_CONTENT_COSMOSDB_KEY;
export const REMOTE_CONTENT_COSMOSDB_NAME =
  process.env.REMOTE_CONTENT_COSMOSDB_NAME ?? "db";

export const BACKEND_PORT = Number(process.env.BACKEND_PORT ?? 0);

export const NOTIFICATION_QUEUE_NAME =
  process.env.NOTIFICATION_QUEUE_NAME ?? "push-notifications";

export const FF_TYPE = process.env.FF_TYPE;

export const MESSAGE_CONTAINER_NAME =
  process.env.MESSAGE_CONTAINER_NAME ?? "message-content";
