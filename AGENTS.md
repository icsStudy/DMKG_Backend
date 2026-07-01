# spacode-backend — Agent Guide

Marketing platform backend monorepo. This file is the index Cursor loads automatically. Detailed docs live in `docs/` — reference them, do not duplicate.

## Monorepo context

This repo is part of **`poc_v1_marketing_system`**. For cross-repo rules (ports, API contract, Hebrew RTL admin UI), read [/AGENTS.md](../AGENTS.md) at the monorepo root.

Full-stack features (new API + admin page) also need:

- [/ARCHITECTURE.md](../ARCHITECTURE.md) — end-to-end system map
- [spacode-frontend/AGENTS.md](../spacode-frontend/AGENTS.md) — frontend conventions and doc index

## Stack

Node 20+, pnpm 9, Turbo, TypeScript, Express, Prisma (PostgreSQL), Redis/BullMQ, Stripe.

## Commands

Run from `spacode-backend/` unless noted.

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Start all services in parallel (Turbo) |
| `pnpm build` | Build all packages and services |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm lint` | Lint all workspaces |
| `pnpm test` | Run tests (depends on build) |

Per-service dev (from service dir or via Turbo filter):

```bash
pnpm --filter @spacode/api-gateway dev
pnpm --filter @spacode/core-service dev
pnpm --filter @spacode/worker-service dev
pnpm --filter @spacode/ai-service dev
pnpm --filter @spacode/social-service dev
```

Database (from `packages/db/`):

```bash
pnpm db:dev      # prisma migrate dev
pnpm db:migrate  # prisma migrate deploy
```

Docker (from `spacode-backend/`):

```bash
docker compose up --build   # postgres + redis + backend-dev (3 containers)
```

## Deployment

| Mode | Containers | Dockerfile | Process manager |
|------|------------|------------|-----------------|
| **Local (no Docker)** | — | — | Turbo (`pnpm dev`) |
| **Docker dev** | 3 (`postgres`, `redis`, `backend-dev`) | `Dockerfile.dev` | Turbo inside `backend-dev` |
| **Production / staging** | 1 (all services) | `Dockerfile` | `pm2-runtime` + `ecosystem.config.js` |

**Production container** runs all five processes (gateway, core, ai, social, worker) via pm2. Only port **3000** is exposed externally; inter-service traffic uses `http://localhost:3010|3020|3030` (set in `ecosystem.config.js` and `.env.example`).

**Entrypoint** (`docker-entrypoint.sh`) runs `prisma generate` + `prisma migrate deploy` once before pm2 starts when `DATABASE_URL` is set.

**Railway / Render:** set Root Directory to `spacode-backend` and build from root `Dockerfile`.

Per-service Dockerfiles under `services/*/Dockerfile` remain for optional single-service deploys but are not used by the default CI/CD flow.

## Documentation index

| Doc | Purpose |
|-----|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System topology, request lifecycle, queues, auth |
| [docs/services/api-gateway.md](docs/services/api-gateway.md) | Gateway proxy routes, auth, rate limits |
| [docs/services/core-service.md](docs/services/core-service.md) | Domain modules, middleware, queue producers |
| [docs/services/worker-service.md](docs/services/worker-service.md) | BullMQ workers, cron jobs |
| [docs/services/ai-service.md](docs/services/ai-service.md) | AI/marketing/content/website (stub) |
| [docs/services/social-service.md](docs/services/social-service.md) | OAuth, webhooks, social publish (stub) |
| [docs/packages/db.md](docs/packages/db.md) | Prisma schema, migrations |
| [docs/packages/types.md](docs/packages/types.md) | Shared DTOs, queue names, payloads |
| [docs/packages/utils.md](docs/packages/utils.md) | JWT, encryption, errors, responses |

Nested `AGENTS.md` files in `services/*/` provide local quick rules when editing inside a service.

## Conventions

- **ESM in core-service:** use `.js` extensions in import paths (`import { x } from './foo.js'`).
- **Router + service pattern:** thin routers validate/route; services hold business logic (`modules/<domain>/`).
- **Validation:** Zod schemas at route boundaries.
- **Errors/responses:** `@spacode/utils` — `AppError`, `Errors.*`, `success()`, `sendPaginated()`.
- **Shared contracts:** define queue payloads and API DTOs in `@spacode/types` before changing shapes.
- **Database:** schema changes require a Prisma migration in `packages/db`.

## Service boundaries

| Service | Responsibility | Do not |
|---------|----------------|--------|
| **api-gateway** (:3000) | Auth, rate limits, reverse proxy | Prisma, business logic |
| **core-service** (:3010) | Domain logic, enqueue async jobs | AI/social HTTP, inline email send |
| **worker-service** | Consume BullMQ queues, cron | HTTP endpoints |
| **ai-service** (:3020) | AI/marketing/content/website HTTP | Stub today — extend here, not core |
| **social-service** (:3030) | OAuth, webhooks, social publish HTTP | Stub today — extend here, not core |

**Packages** (`db`, `types`, `utils`) are shared libraries. Services depend on packages; packages never depend on services.

## Feature checklist

When adding a feature end-to-end:

1. Add/update types in `@spacode/types`
2. Add Prisma migration in `@spacode/db` if schema changes
3. Implement core module (`router` + `service`) in core-service
4. Wire gateway proxy route if new public path (auth + limiter)
5. Add worker + register in `queues.ts` if async
6. Update relevant doc in `docs/services/` or `docs/packages/`

## Pre-commit

Before finishing work:

- Run `pnpm typecheck` and `pnpm test` in affected packages
- Update the relevant service or package doc
- Do not commit secrets — use variable names from `.env.example` only in docs

## Ports (quick reference)

| Service | Port | Env var | Exposed in prod? |
|---------|------|---------|------------------|
| api-gateway | 3000 | `PORT` | Yes |
| core-service | 3010 | `CORE_PORT` | No (localhost only) |
| ai-service | 3020 | `AI_PORT` | No (localhost only) |
| social-service | 3030 | `SOCIAL_PORT` | No (localhost only) |
| worker-service | — | — | No (background) |

**Internal URLs** (gateway → backends; worker → core):

| Target | Env var | Unified container / docker-compose dev |
|--------|---------|----------------------------------------|
| core-service | `CORE_SERVICE_URL` | `http://localhost:3010` |
| ai-service | `AI_SERVICE_URL` | `http://localhost:3020` |
| social-service | `SOCIAL_SERVICE_URL` | `http://localhost:3030` |

Full env reference: `.env.example` and per-service docs.
