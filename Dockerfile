# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY services ./services
RUN pnpm install --frozen-lockfile

FROM base AS builder
# Copy full pnpm workspace layout (not just root node_modules) so package bins like prisma resolve.
COPY --from=deps /app ./
COPY . .
RUN npm install -g prisma@6.19.3
RUN pnpm turbo run build

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN npm install -g pm2 prisma@6.19.3

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app .

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["pm2-runtime", "ecosystem.config.js"]
