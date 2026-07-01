# core-service

Domain service: authentication, organizations, businesses, leads, billing, email, analytics, SEO, CRM, and admin. Owns queue **producers** for email and lead scoring. All business logic lives here — not in the gateway or worker.

---

## Role

- HTTP API mounted at `/api/v1/*` (plus `/api/contact` and Stripe webhook).
- Validates identity from gateway-injected headers (`gatewayContext`).
- Persists data via `@spacode/db` / Prisma.
- Enqueues async jobs to Redis (email send, bulk email, lead score).
- Runs Prisma migrations on startup.

---

## Port / process type

| Setting | Value |
|---------|-------|
| Default port | `3010` |
| Env var | `CORE_PORT` (falls back to `PORT`) |
| Process | Long-running HTTP server |

---

## Key files

| Path | Purpose |
|------|---------|
| [`src/server.ts`](../../services/core-service/src/server.ts) | App bootstrap, migration-on-boot, router mounting |
| [`src/config.ts`](../../services/core-service/src/config.ts) | Zod-validated env schema |
| [`src/middleware/gateway-context.ts`](../../services/core-service/src/middleware/gateway-context.ts) | Decode gateway headers, `requireAuth` |
| [`src/middleware/require-business.ts`](../../services/core-service/src/middleware/require-business.ts) | Business tenancy guard |
| [`src/middleware/require-super-admin.ts`](../../services/core-service/src/middleware/require-super-admin.ts) | Super-admin guard |
| [`src/middleware/parse-pagination.ts`](../../services/core-service/src/middleware/parse-pagination.ts) | `page` / `limit` → `req.pagination` |
| [`src/middleware/error-handler.ts`](../../services/core-service/src/middleware/error-handler.ts) | `asyncHandler`, global error handler |
| [`src/lib/queue.ts`](../../services/core-service/src/lib/queue.ts) | BullMQ producers (3 queues) |
| [`src/lib/redis.ts`](../../services/core-service/src/lib/redis.ts) | Redis connection |
| [`src/lib/stripe.ts`](../../services/core-service/src/lib/stripe.ts) | Stripe client |
| [`src/lib/plan-limits.ts`](../../services/core-service/src/lib/plan-limits.ts) | Subscription plan definitions |

---

## Modules

Each domain follows **thin router + fat service** in `src/modules/<domain>/`:

| Module | Mount path | Router file |
|--------|------------|-------------|
| auth | `/api/v1/auth` | `auth/auth.router.ts` |
| profile 2FA | `/api/v1/profile/2fa` | `auth/auth.router.ts` (`profile2faRouter`) |
| businesses | `/api/v1/businesses` | `businesses/businesses.router.ts` |
| leads | `/api/v1/leads` | `leads/leads.router.ts` |
| contact | `/api/contact` | `leads/leads.router.ts` (`contactRouter`) |
| billing | `/api/v1/billing` | `billing/billing.router.ts` |
| stripe webhook | `/api/v1/webhooks/stripe` | `billing/billing.router.ts` (`stripeWebhookRouter`) |
| admin | `/api/v1/admin` | `admin/admin.router.ts` |
| analytics | `/api/v1/analytics` | `analytics/analytics.router.ts` |
| email | `/api/v1/email` | `email/email.router.ts` |
| seo | `/api/v1/seo` | `seo/seo.router.ts` |
| crm | `/api/v1/crm` | `crm/crm.router.ts` |

### Route inventory

**Auth** (`/api/v1/auth`) — public except invite:

| Method | Path | Auth |
|--------|------|------|
| POST | `/request-code` | Public |
| POST | `/verify-code` | Public |
| POST | `/google` | Public |
| POST | `/refresh` | Public |
| POST | `/invite` | JWT |
| POST | `/accept-invite` | Public |

**Profile 2FA** (`/api/v1/profile/2fa`) — JWT required:

| Method | Path |
|--------|------|
| POST | `/setup` |
| POST | `/verify` |

**Businesses** (`/api/v1/businesses`) — JWT; `requireBusiness` on profile routes:

| Method | Path |
|--------|------|
| GET/POST | `/` |
| GET/PUT/DELETE | `/:businessId` |
| GET/PUT | `/:businessId/profile` |

**Leads** (`/api/v1/leads`) — JWT + `requireBusiness` + pagination:

| Method | Path |
|--------|------|
| GET/POST | `/` |
| POST | `/bulk` |
| GET/PUT/DELETE | `/:leadId` |
| GET | `/:leadId/timeline` |
| POST | `/:leadId/convert` |

**Contact** (`/api/contact`) — public:

| Method | Path |
|--------|------|
| POST | `/` |

**Billing** (`/api/v1/billing`):

| Method | Path | Auth |
|--------|------|------|
| GET | `/plans` | Public |
| GET | `/subscription` | JWT |
| POST | `/portal` | JWT |

**Admin** (`/api/v1/admin`) — JWT + super admin:

| Method | Path |
|--------|------|
| GET | `/stats` |
| GET | `/users/export` |
| GET | `/leads/:businessId/export` |

**Analytics** (`/api/v1/analytics`) — JWT + business:

| Method | Path |
|--------|------|
| GET | `/overview`, `/funnel`, `/trends`, `/export` |

**Email** (`/api/v1/email`) — JWT + business:

| Method | Path |
|--------|------|
| POST | `/send`, `/bulk`, `/track` |
| GET/POST/PUT | `/templates`, `/templates/:templateId` |

**SEO** (`/api/v1/seo`) — JWT + business:

| Method | Path |
|--------|------|
| GET/PUT | `/profile` |
| POST | `/audit` |
| GET | `/audits` |
| GET/POST | `/google`, `/google/connect`, `/google/sync` |

**CRM** (`/api/v1/crm`) — JWT + business:

| Method | Path |
|--------|------|
| GET | `/adapters`, `/connections` |
| POST/DELETE | `/connections/:adapter` |
| POST | `/sync/:adapter` |

---

## Middleware stacks

Global (all requests):

```
gatewayContext  →  decodes x-user-id, x-org-id, x-system-role; loads membershipRole
```

| Scope | Stack |
|-------|-------|
| **Public** | `gatewayContext` only (auth routes, contact, billing plans, stripe webhook) |
| **Authenticated (org)** | `gatewayContext` → `requireAuth` (businesses, billing subscription/portal, invite) |
| **Business-scoped** | `gatewayContext` → `requireAuth` → `requireBusiness` (leads, analytics, email, seo, crm) |
| **Business + pagination** | Above + `parsePagination` (leads list) |
| **Super admin** | `gatewayContext` → `requireAuth` → `requireSuperAdmin` (admin) |

`requireBusiness` resolves business ID from (in order): `x-business-id` header, `?businessId` query, `:businessId` route param.

Stripe webhook bypasses JSON parser — uses raw body on dedicated router mounted before `express.json()`.

---

## Queue producers

Defined in [`src/lib/queue.ts`](../../services/core-service/src/lib/queue.ts):

| Function | Queue | Triggered by |
|----------|-------|--------------|
| `enqueueLeadScore(leadId)` | `lead-score` | Lead create/update flows |
| `enqueueEmail(job)` | `email-send` | Email module send |
| `enqueueBulkEmail(job)` | `bulk-email` | Email module bulk send |

Core does **not** enqueue `social-publish`, `ai-video`, `ai-website`, `google-sync`, or `webhook-process` today — those are consumed by worker-service for future ai/social integrations.

---

## Dependencies

| Package / service | Usage |
|-------------------|-------|
| `@spacode/db` | Prisma client, enums |
| `@spacode/types` | DTOs, queue payloads |
| `@spacode/utils` | JWT signing, errors, responses, encryption |
| Redis | BullMQ queue connection (`REDIS_URL`) |
| Stripe | Billing (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) |
| Google OAuth | Auth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) |

**Upstream:** api-gateway (all external HTTP).  
**Downstream:** PostgreSQL, Redis, Stripe API.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL |
| `REDIS_URL` | No | Redis for queues (default `redis://localhost:6379`) |
| `CORE_PORT` | No | HTTP port (default `3010`) |
| `BUILD_REF` | No | Build identifier in health checks |
| `JWT_PRIVATE_KEY` | Yes* | Sign access/refresh tokens |
| `JWT_PUBLIC_KEY` | Yes* | Verify tokens (also used internally) |
| `ENCRYPTION_KEY` | Yes* | 2FA secrets, token encryption |
| `STRIPE_SECRET_KEY` | No | Billing |
| `STRIPE_WEBHOOK_SECRET` | No | Webhook verification |
| `GOOGLE_CLIENT_ID` | No | Google sign-in |
| `GOOGLE_CLIENT_SECRET` | No | Google sign-in |
| `FRONTEND_URL` | No | Redirect URLs (default `http://localhost:3060`) |
| `AI_SERVICE_URL` | No | Internal AI service URL |

\*Required for auth flows in production.

---

## Migration-on-boot

On startup, `runMigrations()` executes `npx prisma migrate deploy` against `packages/db`. Failures are logged as warnings (acceptable in local dev without DB). Production deployments should ensure migrations succeed before traffic.

---

## Rules for agents

**Do**

- Add new domains as `modules/<name>/{router,service}.ts`; mount in `server.ts`.
- Keep routers thin — validation + call service + `success()` / `sendPaginated()`.
- Use `requireBusiness` for any business-scoped data access.
- Enqueue email and scoring via `lib/queue.ts` — never send email inline in HTTP handlers.
- Use ESM imports with `.js` extension in TypeScript source.

**Don't**

- Add proxy or gateway concerns here.
- Bypass `gatewayContext` for authenticated routes.
- Instantiate BullMQ workers — that belongs in worker-service.
- Call external AI/social APIs directly for long-running work — enqueue instead.

---

## Common tasks

### Add a new API module

1. Create `src/modules/<domain>/<domain>.router.ts` and `<domain>.service.ts`.
2. Apply middleware stack (see table above).
3. Mount in `server.ts`.
4. Add gateway proxy route in `api-gateway` (see [api-gateway.md](api-gateway.md)).
5. Update this doc's route inventory.

### Add async side effect

1. Define payload in `@spacode/types`.
2. Add enqueue helper in `lib/queue.ts` (if core produces) or in ai/social service.
3. Add worker in worker-service.
