# worker-service — local agent rules

Working directory: `services/worker-service/`

Full guide: [../../docs/services/worker-service.md](../../docs/services/worker-service.md)

## Quick rules

- **No HTTP** — background process only; entry point is `src/main.ts`.
- **Register workers** — add new workers in `src/queues.ts` with queue name and concurrency.
- **Payload types** — define job payloads in `@spacode/types` before implementing processors.
- **All 8 queues** — `email-send`, `bulk-email`, `lead-score`, `social-publish`, `ai-video`, `ai-website`, `google-sync`, `webhook-process`.
- **Cron jobs** — scheduled tasks live in `src/cron.ts`; keep idempotent.

## Key entry files

- `src/main.ts` — starts workers and cron jobs
- `src/queues.ts` — worker registration and concurrency
- `src/cron.ts` — scheduled jobs (metrics, stale publish sweep, Google sync tick)
- `src/workers/*.worker.ts` — per-queue job processors

## Run locally

```bash
pnpm dev   # from backend root, or from this directory
```

Requires Redis (`REDIS_URL`) and PostgreSQL (`DATABASE_URL`).
