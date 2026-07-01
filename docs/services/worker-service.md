# worker-service

Background process: BullMQ workers, scheduled cron jobs, and email delivery. No HTTP server — runs as a standalone Node process.

---

## Role

- Consumes all eight queues defined in `@spacode/types`.
- Runs daily metrics aggregation and maintenance crons.
- Sends email via Gmail SMTP (when configured).
- Updates Prisma records (lead scores, email events, publish status, etc.).

---

## Port / process type

| Setting | Value |
|---------|-------|
| HTTP port | None |
| Entry | [`src/main.ts`](../../services/worker-service/src/main.ts) |
| Process | Long-running background worker |

Startup sequence: log build ref → `startAllWorkers()` → `startCronJobs()` → SIGINT/SIGTERM handlers.

---

## Key files

| Path | Purpose |
|------|---------|
| [`src/main.ts`](../../services/worker-service/src/main.ts) | Entry point, graceful shutdown |
| [`src/queues.ts`](../../services/worker-service/src/queues.ts) | Worker registration + concurrency |
| [`src/cron.ts`](../../services/worker-service/src/cron.ts) | Scheduled jobs |
| [`src/config.ts`](../../services/worker-service/src/config.ts) | Env validation |
| [`src/lib/redis.ts`](../../services/worker-service/src/lib/redis.ts) | Redis connection cleanup |
| [`src/lib/mailer.ts`](../../services/worker-service/src/lib/mailer.ts) | Gmail transport |
| [`src/lib/lead-scoring.ts`](../../services/worker-service/src/lib/lead-scoring.ts) | Lead score algorithm |
| [`src/workers/*.worker.ts`](../../services/worker-service/src/workers/) | Per-queue processors |

---

## Workers

Registered in [`src/queues.ts`](../../services/worker-service/src/queues.ts):

| Queue | Worker file | Concurrency | Description |
|-------|-------------|-------------|-------------|
| `email-send` | `email.worker.ts` | 5 | Send single email; record `EmailEvent` + interaction |
| `bulk-email` | `bulk-email.worker.ts` | 2 | Template-based bulk send to lead IDs |
| `lead-score` | `lead-score.worker.ts` | 10 | Recompute `leadScore` from lead fields |
| `social-publish` | `social-publish.worker.ts` | 3 | Publish posts to social platforms |
| `ai-video` | `video.worker.ts` | 2 | Video generation jobs |
| `ai-website` | `website.worker.ts` | 2 | Website generation jobs |
| `google-sync` | `google-sync.worker.ts` | 2 | Google Analytics/Search Console sync |
| `webhook-process` | `webhook-process.worker.ts` | 5 | Process inbound webhook logs |

Failed jobs log `{ queue, jobId, err }` via Pino. Workers share Redis connection from `REDIS_URL`.

### Producer map

| Queue | Current producer |
|-------|------------------|
| `email-send`, `bulk-email`, `lead-score` | core-service (`lib/queue.ts`) |
| `social-publish`, `ai-video`, `ai-website`, `google-sync`, `webhook-process` | Future: social-service / ai-service / core SEO |

---

## Cron jobs

Defined in [`src/cron.ts`](../../services/worker-service/src/cron.ts):

| Schedule | Cron expression | Job |
|----------|-----------------|-----|
| Daily metrics | `5 0 * * *` (00:05 UTC) | Aggregate yesterday's `leadsCreated`, `leadsConverted`, `emailsSent` per business into `DailyMetrics` (up to 500 businesses per run) |
| Stale publish sweep | `*/5 * * * *` (every 5 min) | `sweepStalePublishes()` — mark stuck social publishes as failed |
| Google sync tick | `0 */6 * * *` (every 6 hours) | Log `GoogleIntegration` count (placeholder for future sync enqueue) |

---

## Dependencies

| Package / service | Usage |
|-------------------|-------|
| `@spacode/db` | Prisma reads/writes |
| `@spacode/types` | Queue names, job payloads |
| `@spacode/utils` | Logger |
| Redis | BullMQ connection |
| Gmail | Email delivery (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) |
| core-service URL | Optional HTTP callbacks (`CORE_SERVICE_URL`) |

**Upstream:** Redis (jobs from core and future services).  
**Downstream:** PostgreSQL, Gmail SMTP, external AI/social APIs (in workers).

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL |
| `REDIS_URL` | No | BullMQ (default `redis://localhost:6379`) |
| `BUILD_REF` | No | Logged at startup |
| `GMAIL_USER` | No | SMTP sender |
| `GMAIL_APP_PASSWORD` | No | Gmail app password |
| `SOCIAL_PUBLISH_MAX_MS` | No | Publish timeout (default `600000`) |
| `CORE_SERVICE_URL` | No | Internal core URL (default `http://localhost:3010`) |
| `REPLICATE_API_TOKEN` | No | AI video (Replicate) |
| `RUNWAY_API_KEY` | No | AI video (Runway) |
| `MANUS_API_KEY` | No | AI website (Manus) |
| `FAL_API_KEY` | No | AI video (Fal) |

See [`.env.example`](../../.env.example) for full list.

---

## Rules for agents

**Do**

- Add new workers in `src/workers/<name>.worker.ts`.
- Register every new queue in `queues.ts` with appropriate concurrency.
- Define job payload types in `@spacode/types` before implementing processor.
- Use `prisma` from `@spacode/db` — no duplicate clients.
- Handle idempotency for webhook and publish workers (check existing records).

**Don't**

- Expose HTTP endpoints from this service.
- Enqueue jobs here — producers live in core/ai/social services.
- Block the event loop with long synchronous work; use job timeouts and progress updates.
- Skip registration in `queues.ts` — orphaned queue definitions won't be consumed.

---

## Common tasks

### Add a new worker

1. Add `QUEUE_NAMES` entry + payload type in `@spacode/types`.
2. Create `src/workers/<queue>.worker.ts` with `process*Job(job: Job<Payload>)`.
3. Register in `startAllWorkers()` inside `queues.ts`.
4. Add producer enqueue call in the owning service.
5. Update [types.md](../packages/types.md) and this doc.

### Add a cron job

1. Add `cron.schedule(...)` in `cron.ts`.
2. Keep jobs idempotent and bounded (paginate large tables).
3. Log start/completion with structured fields.

### Graceful shutdown

`main.ts` calls `stopAllWorkers()` → `closeRedis()` → `prisma.$disconnect()` on SIGINT/SIGTERM.
