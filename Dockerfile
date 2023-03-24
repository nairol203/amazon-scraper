FROM node:19-alpine3.16

RUN apk add chromium

USER node

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN npx prisma generate

CMD ["node", "index.js"]