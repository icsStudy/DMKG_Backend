# social-service — local agent rules

Working directory: `services/social-service/`

Full guide: [../../docs/services/social-service.md](../../docs/services/social-service.md)

## Quick rules

- **Stub today** — only `GET /health` exists; implement social/OAuth/webhook endpoints here, not in core-service.
- **Gateway ready** — OAuth callbacks, inbound webhooks, webhook logs, and `/api/v1/social` routes are already proxied.
- **Webhooks** — verify provider signatures; respond fast; enqueue `WEBHOOK_PROCESS` for heavy work.
- **Publishing** — enqueue `SOCIAL_PUBLISH` jobs; worker-service calls platform APIs.
- **Token storage** — encrypt OAuth tokens with `@spacode/utils` encryption.

## Key entry files

- `src/server.ts` — Express bootstrap (extend with modules here)
- `services/api-gateway/src/routes/social.proxy.ts` — gateway routes pointing here

## Run locally

```bash
pnpm dev   # from backend root, or from this directory
```

Default port: `3030` (`SOCIAL_PORT`).
