# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY services/worker-service/package.json ./services/worker-service/
RUN pnpm install --frozen-lockfile --filter @spacode/worker-service...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm turbo run build --filter=@spacode/worker-service

FROM base AS deploy
RUN npm install -g prisma@6.19.3
COPY --from=builder /app .
RUN pnpm deploy --filter=@spacode/worker-service --prod /prod/app \
  && cd /prod/app/node_modules/@spacode/db \
  && prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deploy /prod/app .
CMD ["node", "dist/main.js"]
