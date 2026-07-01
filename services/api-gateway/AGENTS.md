# api-gateway — local agent rules

Working directory: `services/api-gateway/`

Full guide: [../../docs/services/api-gateway.md](../../docs/services/api-gateway.md)

## Quick rules

- **Proxy only** — no Prisma, no business logic, no direct DB access.
- **Auth before proxy** — wire `requireAuth`, `requireApiKey`, or `requireAuthOrPublicApiKey` then rate limiter, then proxy middleware.
- **Stripe exception** — `POST /api/v1/webhooks/stripe` uses raw body parser in `server.ts` before JSON middleware; proxied to core-service.
- **Header injection** — JWT middleware sets `x-user-id`, `x-org-id`, `x-system-role` on proxied requests.
- **New routes** — add to the appropriate proxy file (`core.proxy.ts`, `ai.proxy.ts`, `social.proxy.ts`).

## Key entry files

- `src/server.ts` — bootstrap, Stripe raw-body route, JSON parser
- `src/routes/core.proxy.ts` — core-service proxy routes
- `src/routes/ai.proxy.ts` — ai-service proxy routes
- `src/routes/social.proxy.ts` — social-service proxy routes
- `src/middleware/auth.middleware.ts` — JWT and API key validation

## Run locally

```bash
pnpm dev   # from backend root, or from this directory
```

Default port: `3000` (`PORT`).
