FROM node:19-alpine3.16

RUN apk add chromium

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev \
    && npm install typescript -g

COPY . .

RUN npx prisma generate

RUN tsc

RUN npm uninstall typescript

USER node

CMD ["node", "index.js"]{{[{}]}