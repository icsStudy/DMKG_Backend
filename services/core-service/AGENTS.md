# core-service — local agent rules

Working directory: `services/core-service/`

Full guide: [../../docs/services/core-service.md](../../docs/services/core-service.md)

## Quick rules

- **Router + service pattern** — `modules/<domain>/{router,service}.ts`; keep routers thin.
- **ESM imports** — use `.js` extensions in relative import paths.
- **Business scoping** — use `requireBusiness` middleware for routes under `/api/v1/businesses/:id/...`.
- **Async work** — enqueue via `lib/queue.ts` (`lead-score`, `email-send`, `bulk-email`); never send email inline.
- **Gateway context** — read `x-user-id`, `x-org-id`, `x-system-role` from `gatewayContext` middleware; no JWT parsing here.

## Key entry files

- `src/server.ts` — app bootstrap, migration-on-boot, router mounting
- `src/lib/queue.ts` — BullMQ queue producers
- `src/middleware/gateway-context.ts` — reads gateway-injected headers
- `src/middleware/require-business.ts` — business tenancy guard

## Run locally

```bash
pnpm dev   # from backend root, or from this directory
```

Default port: `3010` (`CORE_PORT`).
