FROM node:24-alpine

WORKDIR /app

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN corepack enable && pnpm install --frozen-lockfile --prod

COPY src ./src
RUN mkdir -p /app/data && echo "[]" > /app/data/sites.json

ENV NODE_ENV=production
ENV CODEX_WP_BRIDGE_REGISTRY_HOST=0.0.0.0
ENV CODEX_WP_BRIDGE_REGISTRY_PORT=8787
ENV CODEX_WP_BRIDGE_SITES_FILE=/app/data/sites.json

EXPOSE 8787

CMD ["node", "src/registry-server.js"]
