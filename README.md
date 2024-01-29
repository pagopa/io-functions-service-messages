# IO Functions Message Services

This project implements the APIs to enable IO Platform consumers to interacts with Message Domain.

## Architecture

The project is structured as follows:


## Contributing

### Setup

Install the [Azure Functions Core Tools](https://github.com/Azure/azure-functions-core-tools).

Install the dependencies:

```
$ yarn install
```

Create a file `local.settings.json` in your cloned repo, with the
following contents:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "WEBSITE_NODE_DEFAULT_VERSION": "10.14.1",
    "AzureWebJobsStorage": "<JOBS_STORAGE_CONNECTION_STRING>",
    "APPINSIGHTS_INSTRUMENTATIONKEY": "<APPINSIGHTS_KEY>",
    "MESSAGE_CONTAINER_NAME": "message-content",
    "COSMOSDB_NAME": "<COSMOSDB_DB_NAME>",
    "COSMOSDB_KEY": "<COSMOSDB_KEY>",
    "COSMOSDB_URI": "<COSMOSDB_URI>",
    "WEBHOOK_CHANNEL_URL": "<WEBHOOK_URL>",
    "QueueStorageConnection": "<QUEUES_STORAGE_CONNECTION_STRING>",
    "AssetsStorageConnection": "<ASSETS_STORAGE_CONNECTION_STRING>",
    "STATUS_ENDPOINT_URL": "<APP_BACKEND_INFO_ENDPOINT>",
    "STATUS_REFRESH_INTERVAL_MS": "<STATUS_REFRESH_INTERVAL_MS>",
    "SUBSCRIPTIONS_FEED_TABLE": "SubscriptionsFeedByDay"
  },
  "ConnectionStrings": {}
}
```

### Starting the functions runtime

```
$ yarn start
```

The server should reload automatically when the code changes.

This microservice use https://github.com/pagopa/aks-microservice-chart-blueprint to release it in k8s.

## How to upgrade helm microservice chart release

Follow this steps if you need to upgrade the microservice-chart release.

### step 1) update dependencies microservice-chart version

```yaml
apiVersion: v2
name: microservice-ms
description: microservice-ms
type: application
version: 1.0.0
appVersion: 1.0.0
dependencies:
  - name: microservice-chart
    version: 1.20.0 # change me
    repository: 'https://pagopa.github.io/aks-microservice-chart-blueprint'
```

### step2) update helm dependency to set Chart.lock

```sh
helm dependency update helm/
```

### Run integration tests locally

Enter in the integration tests directory

```bash
cd __integrations__/
```

Install the dependencies

```bash
yarn install --frozen-lockfile
```

Start containers

```bash
yarn start
```

Execute tests inside the agent containers

```
docker exec fn-service-messages-testagent yarn test
```

Then you can stop all the containers running

```
yarn stop
```
