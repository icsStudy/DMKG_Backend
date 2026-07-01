# api-gateway

Public HTTP edge for the marketing platform. Terminates TLS (in deployment), applies CORS and rate limits, verifies JWT/API keys, and reverse-proxies to backend services. **No domain logic, Prisma, or queue code.**

---

## Role

- Single public entry point (default port 3000).
- Auth translation: JWT → internal headers (`x-user-id`, `x-org-id`, `x-system-role`).
- Rate limiting per route group.
- Special handling for Stripe webhook raw body.

---

## Port / process type

| Setting | Value |
|---------|-------|
| Default port | `3000` |
| Env var | `PORT` |
| Process | Long-running HTTP server |

---

## Key files

| Path | Purpose |
|------|---------|
| [`src/server.ts`](../../services/api-gateway/src/server.ts) | Express app, Stripe raw route, JSON parser, listen |
| [`src/config.ts`](../../services/api-gateway/src/config.ts) | Zod env validation |
| [`src/routes/index.ts`](../../services/api-gateway/src/routes/index.ts) | Mount order: ai → social → core |
| [`src/routes/core.proxy.ts`](../../services/api-gateway/src/routes/core.proxy.ts) | Core-service proxy routes |
| [`src/routes/ai.proxy.ts`](../../services/api-gateway/src/routes/ai.proxy.ts) | AI-service proxy routes |
| [`src/routes/social.proxy.ts`](../../services/api-gateway/src/routes/social.proxy.ts) | Social-service proxy routes |
| [`src/middleware/auth.middleware.ts`](../../services/api-gateway/src/middleware/auth.middleware.ts) | JWT + API key guards |
| [`src/middleware/rate-limit.ts`](../../services/api-gateway/src/middleware/rate-limit.ts) | express-rate-limit presets |
| [`src/middleware/cors.ts`](../../services/api-gateway/src/middleware/cors.ts) | CORS from `CORS_ORIGIN` |
| [`src/middleware/request-id.ts`](../../services/api-gateway/src/middleware/request-id.ts) | Request ID header |

---

## Middleware pipeline

```
requestId → httpLogger → corsMiddleware
  → GET /health (local)
  → POST /api/v1/webhooks/stripe (raw body + webhooksLimiter + stripeProxy)
  → express.json / urlencoded
  → aiRouter → socialRouter → coreRouter
```

Route routers are mounted in [`routes/index.ts`](../../services/api-gateway/src/routes/index.ts). AI and social routers register **before** core so specific paths are not shadowed.

---

## Auth middleware

From [`auth.middleware.ts`](../../services/api-gateway/src/middleware/auth.middleware.ts):

| Middleware | Behavior |
|------------|----------|
| `requireAuth` | Requires `Authorization: Bearer <jwt>`; verifies RS256; sets `x-user-id`, `x-org-id`, `x-system-role` |
| `requireApiKey('public')` | Validates `x-api-key === PUBLIC_API_KEY` |
| `requireApiKey('admin')` | Validates `x-api-key === ADMIN_API_KEY` |
| `requireAuthOrPublicApiKey` | Public API key **or** JWT (used for lead creation) |
| `optionalAuth` | Sets headers if valid JWT present; continues without on failure |
| `hasUserContext(req)` | Helper: returns whether `x-user-id` is set |

401 responses: `{ success: false, error: { code, message } }`.

---

## Rate limiters

From [`rate-limit.ts`](../../services/api-gateway/src/middleware/rate-limit.ts) — all use a 60-second window:

| Limiter | Max req/min | Used on |
|---------|-------------|---------|
| `authLimiter` | 10 | `/api/v1/auth/*` |
| `leadsLimiter` | 100 | `/api/contact`, `/api/v1/leads` (authenticated) |
| `emailLimiter` | 50 | `/api/v1/email/*` |
| `analyticsLimiter` | 30 | `/api/v1/analytics/*` |
| `webhooksLimiter` | 1000 | Stripe, inbound/social webhooks |
| `defaultLimiter` | 200 | Businesses, AI routes, social routes |

---

## Route table

### Gateway-local

| Method | Path | Target | Auth | Limiter | Notes |
|--------|------|--------|------|---------|-------|
| GET | `/health` | Local | None | — | `{ ok, service, buildRef }` |
| POST | `/api/v1/webhooks/stripe` | core-service | None | webhooksLimiter | Raw body; proxied before JSON parser |

### Core-service proxy (`CORE_SERVICE_URL`)

| Method | Path prefix | Auth | Limiter | Notes |
|--------|-------------|------|---------|-------|
| * | `/api/v1/auth` | None | authLimiter | Login, OTP, Google, refresh |
| GET | `/api/v1/billing/plans` | None | — | Public plan list |
| POST | `/api/contact` | None | leadsLimiter | Contact form |
| * | `/api/email` | Admin API key | — | Legacy admin email API |
| POST | `/api/v1/leads` | JWT **or** public API key | — | Lead capture |
| * | `/api/v1/leads` | JWT | leadsLimiter | All other lead methods |
| * | `/api/v1/analytics` | JWT | analyticsLimiter | |
| * | `/api/v1/email` | JWT | emailLimiter | |
| * | `/api/v1/billing` | JWT | — | Excludes `/plans` (registered separately) |
| * | `/api/v1/profile` | JWT | — | Proxied to core (2FA at `/profile/2fa`) |
| * | `/api/v1/crm` | JWT | — | |
| * | `/api/v1/admin` | JWT | — | Super-admin enforced in core |
| * | `/api/v1/businesses/:id/integrations` | JWT | — | Future integrations |
| * | `/api/v1/businesses/:id/seo` | JWT | — | Gateway path; core mounts SEO at `/api/v1/seo` |
| * | `/api/v1/businesses` | JWT | defaultLimiter | CRUD + nested routes |

### AI-service proxy (`AI_SERVICE_URL`)

| Method | Path prefix | Auth | Limiter | Notes |
|--------|-------------|------|---------|-------|
| GET | `/p/:slug` | None | — | Public landing pages |
| * | `/api/v1/businesses/:id/marketing` | JWT | defaultLimiter | Marketing plans |
| * | `/api/v1/businesses/:id/content-items` | JWT | defaultLimiter | Content items |
| * | `/api/v1/businesses/:id/website` | JWT | defaultLimiter | AI website jobs |
| POST | `/api/v1/webhooks/manus` | None | — | Manus AI webhook |

### Social-service proxy (`SOCIAL_SERVICE_URL`)

| Method | Path | Auth | Limiter | Notes |
|--------|------|------|---------|-------|
| * | `/api/v1/social/callback` | None | — | OAuth callbacks |
| * | `/api/v1/webhooks/inbound` | None | webhooksLimiter | Generic inbound |
| GET/POST | `/api/v1/webhooks/meta/leadgen` | None | webhooksLimiter | Meta lead ads |
| GET/POST | `/api/v1/webhooks/tiktok/leadgen` | None | webhooksLimiter | TikTok lead gen |
| POST | `/api/v1/webhooks/linkedin/leadgen` | None | webhooksLimiter | LinkedIn lead gen |
| GET | `/api/v1/webhooks/logs` | JWT | — | Webhook log viewer |
| POST | `/api/v1/webhooks/retry/:id` | JWT | — | Retry failed webhook |
| * | `/api/v1/social` | JWT | defaultLimiter | Social connections, publish |

---

## Dependencies

| Package / service | Usage |
|-------------------|-------|
| `@spacode/utils` | `verifyToken`, `httpLogger`, `logger` |
| core-service | Most `/api/v1/*` routes |
| ai-service | Marketing, content, website, public pages |
| social-service | OAuth, webhooks, social API |

**Requires:** `JWT_PUBLIC_KEY`, `PUBLIC_API_KEY`, `ADMIN_API_KEY`, service URLs.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Listen port (default `3000`) |
| `BUILD_REF` | No | Health check build ref |
| `CORE_SERVICE_URL` | Yes | core-service base URL |
| `AI_SERVICE_URL` | Yes | ai-service base URL |
| `SOCIAL_SERVICE_URL` | Yes | social-service base URL |
| `JWT_PUBLIC_KEY` | Yes | Verify access tokens |
| `PUBLIC_API_KEY` | Yes | Public lead capture key |
| `ADMIN_API_KEY` | Yes | Legacy admin routes |
| `CORS_ORIGIN` | No | Allowed origin (default `http://localhost:3060`) |

---

## Rules for agents

**Do**

- Add new public routes in the appropriate `*.proxy.ts` file.
- Always chain auth middleware **before** the proxy handler (`chain(requireAuth, limiter)`).
- Use `requireAuthOrPublicApiKey` when external sites submit leads without user login.
- Register Stripe and other signature-verified webhooks with raw body handling in `server.ts`.
- Keep proxy config as `changeOrigin: true` only — no path rewriting unless documented.

**Don't**

- Import `@spacode/db`, Prisma, or BullMQ.
- Implement business logic, validation schemas, or database queries.
- Add JSON body parser before Stripe webhook route.
- Skip rate limiters on auth or webhook-heavy paths.

---

## Common tasks

### Proxy a new core route

1. Identify auth requirement (public / JWT / API key).
2. Pick limiter from table above.
3. Add `coreRouter.use('/api/v1/...', ...chain(middleware))` in `core.proxy.ts`.
4. Ensure core-service mounts the handler at the same path.

### Proxy a new AI or social route

Add to `ai.proxy.ts` or `social.proxy.ts`. OAuth callbacks and provider webhooks stay **unauthenticated** at the gateway; verify signatures in the target service.

### Add a webhook with raw body

Follow Stripe pattern in `server.ts`: mount `express.raw()` route **before** `express.json()`, apply `webhooksLimiter`, proxy to service that verifies HMAC.
