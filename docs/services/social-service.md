# social-service

## Role

Dedicated HTTP service for social media integrations: OAuth callbacks, inbound webhooks (Meta, TikTok, LinkedIn), social account management, and post publishing. The gateway already routes traffic here; social domain logic belongs in this service, not in core-service.

**Current state:** health-only stub. Only `GET /health` is implemented. All gateway-proxied routes below return 404 until handlers are added.

## Port / process type

| Property | Value |
|----------|-------|
| Default port | `3030` (`SOCIAL_PORT` or `PORT`) |
| Process type | Long-running HTTP server (Express) |
| Entry point | `services/social-service/src/server.ts` |

## Key files

| Path | Purpose |
|------|---------|
| `services/social-service/src/server.ts` | Express app bootstrap (stub) |
| `services/api-gateway/src/routes/social.proxy.ts` | Gateway proxy routes → this service |
| `packages/types/src/queue.types.ts` | `SOCIAL_PUBLISH`, `WEBHOOK_PROCESS` job payloads |
| `services/worker-service/src/workers/social-publish.worker.ts` | Consumes `social-publish` queue |

## Routes owned (via gateway)

Gateway mounts `socialRouter` in `services/api-gateway/src/routes/index.ts`. Requests hit the gateway first, then proxy to `SOCIAL_SERVICE_URL`.

| Gateway path | Auth | Rate limit | Status |
|--------------|------|------------|--------|
| `* /api/v1/social/callback` | None | — | **Planned** — OAuth provider callbacks |
| `* /api/v1/webhooks/inbound` | None | `webhooksLimiter` | **Planned** — generic inbound webhooks |
| `GET/POST /api/v1/webhooks/meta/leadgen` | None | `webhooksLimiter` | **Planned** — Meta lead gen |
| `GET/POST /api/v1/webhooks/tiktok/leadgen` | None | `webhooksLimiter` | **Planned** — TikTok lead gen |
| `POST /api/v1/webhooks/linkedin/leadgen` | None | `webhooksLimiter` | **Planned** — LinkedIn lead gen |
| `GET /api/v1/webhooks/logs` | JWT (`requireAuth`) | — | **Planned** — webhook delivery logs |
| `POST /api/v1/webhooks/retry/:id` | JWT | — | **Planned** — retry failed webhook |
| `* /api/v1/social` | JWT | `defaultLimiter` | **Planned** — accounts, posts, publish |

Auth headers injected by gateway on authenticated routes: `x-user-id`, `x-org-id`, `x-system-role`.

## Dependencies

**Packages:** `@spacode/db`, `@spacode/types`, `@spacode/utils` (declared; not yet used in stub)

**Upstream:** api-gateway (all external traffic), OAuth providers (Meta, TikTok, LinkedIn, etc.)

**Downstream:** PostgreSQL (via `@spacode/db`), Redis/BullMQ (`social-publish`, `webhook-process` queues handled by worker-service)

## Middleware / auth patterns

When implementing routes:

- OAuth callbacks (`/api/v1/social/callback/*`) — no JWT; validate OAuth state/nonce and exchange codes server-side.
- Inbound webhooks — verify provider signatures (Meta, TikTok, LinkedIn); respond quickly; enqueue `webhook-process` for heavy work.
- Authenticated routes — read `x-user-id`, `x-org-id` from gateway headers; scope by business.
- Use Zod validation, `@spacode/utils` error/response helpers.

## Env vars

| Variable | Required | Description |
|----------|----------|-------------|
| `SOCIAL_PORT` | No | Listen port (default `3030`) |
| `PORT` | No | Fallback port |
| `BUILD_REF` | No | Build identifier in health response |
| `DATABASE_URL` | Yes (when using db) | PostgreSQL connection |
| `REDIS_URL` | Yes (when enqueueing) | BullMQ connection |
| `ENCRYPTION_KEY` | Yes (when storing tokens) | AES-256-GCM for OAuth tokens |
| `SOCIAL_PUBLISH_MAX_MS` | No | Max publish job duration (worker) |

Platform-specific OAuth credentials will be added as integrations are built. See `.env.example` at backend root.

## Module inventory

| Module | Status |
|--------|--------|
| Health | Implemented (`GET /health`) |
| OAuth callbacks | Not started |
| Inbound webhooks (Meta/TikTok/LinkedIn) | Not started |
| Webhook logs / retry | Not started |
| Social accounts & publishing | Not started |

## Rules for agents

**Do:**

- Implement OAuth callbacks and social HTTP endpoints here.
- Verify webhook signatures before processing; enqueue async work via `WEBHOOK_PROCESS` or `SOCIAL_PUBLISH`.
- Encrypt OAuth tokens at rest using `@spacode/utils` encryption.
- Update this doc when adding routes or env vars.

**Don't:**

- Add social/OAuth logic to core-service or api-gateway (gateway only proxies).
- Process webhooks synchronously for heavy work — enqueue and return 200 quickly.
- Store plaintext OAuth tokens.

## Common tasks

### Add an OAuth callback handler

1. Create route under `/api/v1/social/callback/<provider>` in social-service.
2. Validate state parameter; exchange code for tokens; encrypt and persist via `@spacode/db`.
3. Redirect user back to frontend success/error URL.
4. Gateway already proxies `/api/v1/social/callback` without auth.

### Add an inbound webhook handler

1. Implement verification (GET challenge for Meta/TikTok; signature check for POST).
2. Parse payload; write to `webhookLog` table; enqueue `WEBHOOK_PROCESS` job.
3. Return 200 immediately.
4. Gateway applies `webhooksLimiter` — no JWT required.

### Add a publish endpoint

1. Implement under `/api/v1/social/...` with business scoping.
2. Create post record; enqueue `SOCIAL_PUBLISH` job with `SocialPublishJobPayload`.
3. Worker-service handles actual platform API calls.
