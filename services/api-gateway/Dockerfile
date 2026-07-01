# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY services/api-gateway/package.json ./services/api-gateway/
RUN pnpm install --frozen-lockfile --filter @spacode/api-gateway...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm turbo run build --filter=@spacode/api-gateway

FROM base AS deploy
COPY --from=builder /app .
RUN pnpm deploy --filter=@spacode/api-gateway --prod /prod/app

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deploy /prod/app .
EXPOSE 3000
CMD ["node", "dist/server.js"]
