# @spacode/types

Shared TypeScript contracts: queue names, job payloads, API DTOs, and domain enums. Update here **before** changing queue shapes or public API request/response bodies.

---

## Location

| File | Exports |
|------|---------|
| [`queue.types.ts`](../../packages/types/src/queue.types.ts) | `QUEUE_NAMES`, job payload interfaces |
| [`api.types.ts`](../../packages/types/src/api.types.ts) | `ApiSuccess`, `ApiError`, `PaginatedResponse`, `Pagination` |
| [`auth.types.ts`](../../packages/types/src/auth.types.ts) | `JwtPayload`, `AuthTokens`, `AuthUserDto`, `InternalUserHeaders` |
| [`billing.types.ts`](../../packages/types/src/billing.types.ts) | `PlanId`, `SubscriptionStatus`, `PlanDefinition` |
| [`lead.types.ts`](../../packages/types/src/lead.types.ts) | `LeadStatus`, `LeadSource`, CRUD payloads, `LeadDto` |
| [`social.types.ts`](../../packages/types/src/social.types.ts) | `Platform`, `PublishPayload`, `PublishPostDto`, progress events |
| [`index.ts`](../../packages/types/src/index.ts) | Re-exports all modules |

---

## Queue names and payloads

Defined in `QUEUE_NAMES`:

| Constant | Queue name | Payload type |
|----------|------------|--------------|
| `EMAIL_SEND` | `email-send` | `EmailJobPayload` |
| `BULK_EMAIL` | `bulk-email` | `BulkEmailJobPayload` |
| `LEAD_SCORE` | `lead-score` | `LeadScoreJobPayload` |
| `SOCIAL_PUBLISH` | `social-publish` | `SocialPublishJobPayload` |
| `AI_VIDEO` | `ai-video` | `VideoGenerateJobPayload` |
| `AI_WEBSITE` | `ai-website` | `WebsiteGenerateJobPayload` |
| `GOOGLE_SYNC` | `google-sync` | `GoogleSyncJobPayload` |
| `WEBHOOK_PROCESS` | `webhook-process` | `WebhookProcessJobPayload` |

### Payload shapes

```typescript
interface EmailJobPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  leadId?: string;
  messageId?: string;
}

interface BulkEmailJobPayload {
  templateId: string;
  leadIds: string[];
  variables?: Record<string, string>;
}

interface LeadScoreJobPayload { leadId: string; }

interface SocialPublishJobPayload {
  postId: string;
  businessId: string;
  platforms: string[];
  content: string;
  mediaUrl?: string;
}

interface VideoGenerateJobPayload {
  jobId: string;
  provider: 'fal' | 'replicate_kling' | 'runway_gen4' | 'google_veo';
  prompt: string;
  imageUrls?: string[];
  durationSeconds?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  trim?: { startSec: number; endSec: number };
}

interface WebsiteGenerateJobPayload {
  jobId: string;
  businessId: string;
  mode?: 'fromBusiness' | 'hybrid' | 'custom';
  language?: 'he' | 'en' | 'dual';
  customPrompt?: string;
  designStyle?: string;
  prompt?: string;
  slug?: string;
}

interface GoogleSyncJobPayload { businessId: string; }

interface WebhookProcessJobPayload { logId: string; }
```

Type aliases (`EmailJob`, `AiVideoJob`, etc.) mirror the payload interfaces for BullMQ generic parameters.

---

## API types

| Type | Purpose |
|------|---------|
| `ApiSuccess<T>` | `{ success: true; data: T }` |
| `ApiError` | `{ success: false; error: { code, message, details? } }` |
| `ApiResponse<T>` | Union of success and error |
| `PaginatedResponse<T>` | `{ items, total, page, limit, totalPages }` |
| `Pagination` | `{ page, limit }` query params |

---

## Auth types

| Type | Fields / purpose |
|------|------------------|
| `JwtPayload` | `sub`, `orgId`, `role`, `iat`, `exp` |
| `InternalUserHeaders` | `x-user-id`, `x-org-id`, `x-system-role` |
| `AuthTokens` | `accessToken`, `refreshToken`, `expiresIn` |
| `AuthUserDto` | User + org + plan + 2FA flags returned after login |

---

## Billing types

| Type | Values / fields |
|------|-----------------|
| `PlanId` | `SOLO_BASIC`, `SOLO_PRO`, `AGENCY_BASIC`, `AGENCY_PRO`, `ENTERPRISE` |
| `SubscriptionStatus` | `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELED`, `UNPAID` |
| `PlanDefinition` | Plan metadata with `businessLimit`, `features`, pricing |

---

## Lead types

| Type | Purpose |
|------|---------|
| `LeadStatus` | `new`, `contacted`, `qualified`, `converted`, `lost` |
| `LeadSource` | `api`, `webhook`, `manual`, `crm_sync`, social platforms, … |
| `CreateLeadPayload` | Full lead creation with contact/company fields |
| `UpdateLeadPayload` | Partial update including `status` |
| `LeadFilters` | List query filters |
| `LeadDto` | API response shape |
| `CreateLeadDto` / `UpdateLeadDto` | Simplified API input |

---

## Social types

| Type | Purpose |
|------|---------|
| `Platform` | `meta`, `tiktok`, `linkedin`, `twitter`, `youtube` |
| `PublishPayload` | Queue-compatible publish request |
| `PublishPostDto` | HTTP API input for creating posts |
| `PlatformPublishResult` | Per-platform publish outcome |
| `PublishProgressEvent` | SSE/progress notification shape |

---

## Environment variables

This package reads **no** environment variables directly. Queue and API contracts are pure TypeScript.

---

## Agent rules

**Do**

- Add new queue names to `QUEUE_NAMES` and define payload interfaces in `queue.types.ts` before implementing producers/consumers.
- Keep DTOs in sync with Zod schemas or Prisma models in services.
- Export new types from `index.ts`.

**Don't**

- Put runtime logic, Prisma imports, or env reads in this package.
- Change payload field names without updating both producer and consumer (and migration if persisted).
- Duplicate enum values that already exist in `@spacode/db` — prefer importing Prisma enums for DB-backed values when appropriate.

---

## Common tasks

### Add a new queue

1. Add entry to `QUEUE_NAMES` in `queue.types.ts`.
2. Define `*JobPayload` interface and type alias.
3. Export from `index.ts`.
4. Implement producer (core/ai/social) and consumer (worker-service).
5. Update [worker-service.md](../services/worker-service.md).
