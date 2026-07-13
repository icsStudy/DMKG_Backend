# ai-service

## Role

Dedicated HTTP service for AI-powered marketing features: content generation, landing pages, website builder, and third-party AI webhooks (Manus). The gateway already routes traffic here; domain logic belongs in this service, not in core-service.

**Current state:** marketing plans, content items, calendar, website builder with contact forms, and AI content queue implemented. Public landing pages served at `GET /p/:slug`.

## Port / process type

| Property | Value |
|----------|-------|
| Default port | `3020` (`AI_PORT` or `PORT`) |
| Process type | Long-running HTTP server (Express) |
| Entry point | `services/ai-service/src/server.ts` |

## Key files

| Path | Purpose |
|------|---------|
| `services/ai-service/src/server.ts` | Express app bootstrap (stub) |
| `services/api-gateway/src/routes/ai.proxy.ts` | Gateway proxy routes → this service |
| `packages/types/src/queue.types.ts` | `AI_VIDEO`, `AI_WEBSITE` job payloads (consumed by worker) |

## Routes owned (via gateway)

Gateway mounts `aiRouter` in `services/api-gateway/src/routes/index.ts`. Requests hit the gateway first, then proxy to `AI_SERVICE_URL`.

| Gateway path | Auth | Rate limit | Status |
|--------------|------|------------|--------|
| `GET /p/:slug` | None (public) | — | **Planned** — public landing pages |
| `POST /api/v1/webhooks/manus` | None | — | **Planned** — Manus AI webhook |
| `* /api/v1/businesses/:id/marketing` | JWT (`requireAuth`) | `defaultLimiter` | **Planned** — marketing AI endpoints |
| `* /api/v1/businesses/:id/content-items` | JWT | `defaultLimiter` | **Planned** — content item CRUD/generation |
| `* /api/v1/businesses/:id/website` | JWT | `defaultLimiter` | **Planned** — website builder |

Auth headers injected by gateway: `x-user-id`, `x-org-id`, `x-system-role`.

## Dependencies

**Packages:** `@spacode/db`, `@spacode/types`, `@spacode/utils` (declared; not yet used in stub)

**Upstream:** api-gateway (all external traffic)

**Downstream:** PostgreSQL (via `@spacode/db`), Redis/BullMQ (for enqueueing `ai-video` / `ai-website` jobs to worker-service)

## Middleware / auth patterns

When implementing routes:

- Read tenant context from gateway-injected headers (`x-user-id`, `x-org-id`, `x-system-role`).
- Validate business scope with `x-business-id` header or path param `:id` — mirror core-service `requireBusiness` patterns.
- Use Zod for request validation; `@spacode/utils` `AppError` / `Errors.*` for errors; `success` / `sendPaginated` for responses.
- Public routes (`/p/:slug`, `/api/v1/webhooks/manus`) must verify signatures or slugs — do not rely on JWT.

## Env vars

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_PORT` | No | Listen port (default `3020`) |
| `PORT` | No | Fallback port |
| `BUILD_REF` | No | Build identifier in health response |
| `DATABASE_URL` | Yes (when using db) | PostgreSQL connection |
| `REDIS_URL` | Yes (when enqueueing) | BullMQ connection |
| `GEMINI_API_KEY` | No | Google Gemini provider |
| `ANTHROPIC_API_KEY` | No | Anthropic provider |
| `MANUS_API_KEY` | No | Manus webhook/API |
| `FAL_API_KEY` | No | fal.ai video generation |

See `.env.example` at backend root for full list.

## Module inventory

| Module | Status |
|--------|--------|
| Health | Implemented (`GET /health`) |
| Marketing | Not started |
| Content items | Not started |
| Website builder | Not started |
| Public landing pages (`/p/:slug`) | Not started |
| Manus webhook | Not started |

## Rules for agents

**Do:**

- Implement new AI/marketing/content/website HTTP endpoints here.
- Enqueue long-running work (`AI_VIDEO`, `AI_WEBSITE`) to BullMQ; let worker-service process jobs.
- Add router + service modules under `src/modules/` following core-service conventions.
- Update this doc when adding routes or env vars.

**Don't:**

- Add AI business logic to core-service or api-gateway.
- Send emails or publish to social platforms directly — use queues.
- Skip webhook signature verification on `/api/v1/webhooks/manus`.

## Common tasks

### Add a new authenticated AI endpoint

1. Create `src/modules/<domain>/<domain>.router.ts` and `<domain>.service.ts`.
2. Mount router in `server.ts` under the matching path prefix (gateway already proxies the prefix).
3. Validate input with Zod; use `@spacode/types` DTOs where shared.
4. If async (video/website generation), enqueue via BullMQ using payloads from `@spacode/types`.
5. Update this doc's route table.

### Add a public landing page handler

1. Implement `GET /p/:slug` in ai-service (gateway proxies without auth).
2. Resolve slug from DB; return HTML or redirect.
3. No JWT required — validate slug existence and publication status only.
