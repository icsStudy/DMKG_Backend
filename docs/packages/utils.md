# @spacode/utils

Cross-cutting utilities used by all services: authentication tokens, encryption, structured errors, HTTP response helpers, webhook HMAC verification, and logging.

---

## Location

| Module | File |
|--------|------|
| Barrel export | [`src/index.ts`](../../packages/utils/src/index.ts) |
| JWT | [`src/jwt.ts`](../../packages/utils/src/jwt.ts) |
| Encryption | [`src/encryption.ts`](../../packages/utils/src/encryption.ts) |
| Errors | [`src/errors.ts`](../../packages/utils/src/errors.ts) |
| Response | [`src/response.ts`](../../packages/utils/src/response.ts) |
| HMAC | [`src/hmac.ts`](../../packages/utils/src/hmac.ts) |
| Logger | [`src/logger.ts`](../../packages/utils/src/logger.ts) |

---

## Exports

### JWT (`jwt.ts`)

| Function | Purpose |
|----------|---------|
| `signAccessToken(payload)` | RS256 access token with `JWT_PRIVATE_KEY` |
| `signRefreshToken(userId)` | Refresh token with `type: 'refresh'` claim |
| `verifyToken(token)` | Verify access token → `JwtPayload`; throws `AppError` on failure |
| `verifyRefreshToken(token)` | Verify refresh token → `{ sub }` |
| `decodeGatewayContext(headers)` | Parse `x-user-id`, `x-org-id`, `x-system-role` from proxied headers |

### Encryption (`encryption.ts`)

| Function | Purpose |
|----------|---------|
| `encrypt(plaintext)` | AES-256-GCM; returns `iv:authTag:ciphertext` hex string |
| `decrypt(ciphertext)` | Reverse of `encrypt` |

Used for storing sensitive tokens (e.g. 2FA secrets, OAuth tokens).

### Errors (`errors.ts`)

| Export | Purpose |
|--------|---------|
| `AppError` | `{ message, code, statusCode, details? }` |
| `ErrorCodes` | `AUTH_REQUIRED`, `AUTH_INVALID_TOKEN`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `BUSINESS_LIMIT_EXCEEDED`, `INTERNAL_ERROR`, `PLAN_REQUIRED` |
| `Errors.notFound`, `.unauthorized`, `.forbidden`, `.validation`, `.conflict`, `.internal` | Factory helpers |

### Response (`response.ts`)

| Function | Purpose |
|----------|---------|
| `success` / `sendSuccess(res, data, status?)` | `{ success: true, data }` |
| `fail` / `sendFail(res, err)` | `{ success: false, error: … }` |
| `sendPaginated(res, items, total, page, limit)` | Paginated list wrapper |
| `errorHandler` | Express error middleware (also duplicated in core-service middleware) |

### HMAC (`hmac.ts`)

| Function | Purpose |
|----------|---------|
| `hashToken(token)` | SHA-256 hex digest (refresh token storage) |
| `verifyHmac(payload, signature, secret)` | String payload HMAC check |
| `verifyWebhookHmac(rawBody, signature, secret)` | `sha256=<hex>` webhook signature verification |

### Logger (`logger.ts`)

| Export | Purpose |
|--------|---------|
| `logger` | Pino instance (`LOG_LEVEL`, pretty transport in non-production) |
| `httpLogger` | `pino-http` middleware for request logging |

---

## Environment variables

| Variable | Used by | Default | Description |
|----------|---------|---------|-------------|
| `JWT_PRIVATE_KEY` | jwt | — | PEM private key (newlines as `\n` in env) |
| `JWT_PUBLIC_KEY` | jwt | — | PEM public key |
| `JWT_ACCESS_EXPIRES` | jwt | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES` | jwt | `14d` | Refresh token TTL |
| `ENCRYPTION_KEY` | encryption | — | 64 hex chars or 32-byte base64 |
| `LOG_LEVEL` | logger | `info` | Pino log level |
| `NODE_ENV` | logger | — | Enables pretty transport when not `production` |

Gateway only needs `JWT_PUBLIC_KEY` for verification; core-service needs both keys for signing.

---

## Agent rules

**Do**

- Throw `AppError` via `Errors.*` helpers for expected failures (404, 401, validation).
- Use `success()` and `sendPaginated()` for consistent API response envelopes.
- Use `decodeGatewayContext()` in core-service middleware — don't parse gateway headers manually.
- Use `verifyWebhookHmac()` for inbound webhook signature checks with raw body buffers.

**Don't**

- Return ad-hoc error JSON — always use `AppError` + error handler pattern.
- Log secrets or full tokens.
- Duplicate JWT or encryption logic in services — extend utils if new algorithms are needed.
- Import service-specific code into this package.

---

## Common tasks

### Add a new error code

1. Add to `ErrorCodes` in `errors.ts`.
2. Add factory on `Errors` if reusable.
3. Document in API docs if client-facing.

### Add a response helper

Keep helpers generic and stateless. Service-specific formatting belongs in the service layer.
