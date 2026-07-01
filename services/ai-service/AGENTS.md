# ai-service — local agent rules

Working directory: `services/ai-service/`

Full guide: [../../docs/services/ai-service.md](../../docs/services/ai-service.md)

## Quick rules

- **Stub today** — only `GET /health` exists; implement AI endpoints here, not in core-service.
- **Gateway ready** — routes for marketing, content-items, website, landing pages, and Manus webhook are already proxied from api-gateway.
- **Long jobs** — enqueue `AI_VIDEO` and `AI_WEBSITE` to BullMQ; worker-service processes them.
- **Public routes** — `/p/:slug` and `/api/v1/webhooks/manus` have no JWT; verify signatures/slugs instead.

## Key entry files

- `src/server.ts` — Express bootstrap (extend with modules here)
- `services/api-gateway/src/routes/ai.proxy.ts` — gateway routes pointing here

## Run locally

```bash
pnpm dev   # from backend root, or from this directory
```

Default port: `3020` (`AI_PORT`).
