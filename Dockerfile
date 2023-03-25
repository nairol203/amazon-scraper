FROM node:19-alpine3.16

RUN apk add chromium

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev \
    && npm install typescript -g

COPY . .

RUN tsc

RUN npm uninstall typescript

RUN npx prisma generate

USER node

CMD ["node", "index.js"]{{[{}]}