### Build with node
FROM node:14.16.0-slim as node-builder

COPY . /home/node

WORKDIR /home/node

# Danger can requires git
# RUN apt-get update && apt-get install git -y

RUN yarn install --frozen-lockfile

RUN yarn predeploy

### Install dotnet extensions
FROM mcr.microsoft.com/dotnet/sdk:3.1-alpine as dotnet-builder

COPY . /home/node

WORKDIR /home/node

RUN dotnet build -o bin

### Copy files from builders in the final image
# functions base full tag list:
# - https://hub.docker.com/_/microsoft-azure-functions-base
# - https://mcr.microsoft.com/v2/azure-functions/base/tags/list
# functions for node full tag list:
# - https://hub.docker.com/_/microsoft-azure-functions-node
# - https://mcr.microsoft.com/v2/azure-functions/node/tags/list
FROM mcr.microsoft.com/azure-functions/node:3.8.1-node14-slim

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

COPY --from=node-builder /home/node /home/site/wwwroot

COPY --from=dotnet-builder /home/node/bin /home/site/wwwroot/bin

COPY --from=dotnet-builder /home/node/obj /home/site/wwwroot/obj
