FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache curl && npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["node", "dist/index.js"]
