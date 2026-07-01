# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY services/core-service/package.json ./services/core-service/
RUN pnpm install --frozen-lockfile --filter @spacode/core-service...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm turbo run build --filter=@spacode/core-service

FROM base AS deploy
RUN npm install -g prisma@6.19.3
COPY --from=builder /app .
RUN pnpm deploy --filter=@spacode/core-service --prod /prod/app \
  && cd /prod/app/node_modules/@spacode/db \
  && prisma generate

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
RUN npm install -g prisma@6.19.3
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deploy /prod/app .
EXPOSE 3010
COPY services/core-service/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
