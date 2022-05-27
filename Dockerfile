FROM node:14.16.0-slim as builder

COPY . /home/node

WORKDIR /home/node

RUN apt-get update && apt-get install git -y

RUN yarn install

RUN yarn predeploy

FROM mcr.microsoft.com/azure-functions/node:3.8.0-node14-slim
# FROM mcr.microsoft.com/azure-functions/node:3.8.0

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

COPY --from=builder /home/node /home/site/wwwroot
