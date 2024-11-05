FROM node:22-alpine

RUN apk add --no-cache dhclient

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENTRYPOINT node main.js /onvif.yaml