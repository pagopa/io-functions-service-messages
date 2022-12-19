### Build with node
FROM node:14.16.0-slim@sha256:7ff9cf5e411481ee734479637265f063c5f356f496d0f9c47112312cb7b46d42 as node-builder

COPY . /home/node

WORKDIR /home/node

# Danger can requires git
# RUN apt-get update && apt-get install git -y

RUN yarn install --frozen-lockfile

RUN yarn predeploy

### Install dotnet extensions
# dotnet core sdk tag list:
# - https://hub.docker.com/_/microsoft-dotnet-sdk/
# - https://mcr.microsoft.com/v2/dotnet/sdk/tags/list
FROM mcr.microsoft.com/dotnet/sdk:6.0.404-alpine3.17@sha256:25f30fdf15dbde4c2671151944794d30948e378da8963f2e9c1dea4a6a694145 as dotnet-builder

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
FROM mcr.microsoft.com/azure-functions/node:4.15.1-node14-slim@sha256:117c6d6127b492424158ee67429c0759b0b3283d3a8b7c574eb16b1168fb5796

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

COPY --from=node-builder /home/node /home/site/wwwroot

COPY --from=dotnet-builder /home/node/bin /home/site/wwwroot/bin

COPY --from=dotnet-builder /home/node/obj /home/site/wwwroot/obj
