FROM node:22-alpine

RUN apk add --no-cache dhclient
ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY ["package.json", "package-lock.json*", "./"]
RUN npm ci --production --silent 

COPY . .

CMD ["node", "main.js", "/onvif.yaml"]