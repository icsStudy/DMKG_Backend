# @spacode/db

Prisma-backed database access layer. Single source of truth for PostgreSQL schema and the shared `prisma` client singleton.

---

## Location

| Path | Purpose |
|------|---------|
| [`packages/db/prisma/schema.prisma`](../../packages/db/prisma/schema.prisma) | Schema definition |
| [`packages/db/prisma/migrations/`](../../packages/db/prisma/migrations/) | Migration history |
| [`packages/db/src/index.ts`](../../packages/db/src/index.ts) | Client export + type re-exports |
| [`packages/db/src/enums.ts`](../../packages/db/src/enums.ts) | Runtime enum constants (lead status, social platform, etc.) |

---

## Exports

From `index.ts`:

```typescript
export const prisma;           // PrismaClient singleton
export { Prisma, PlanId, SystemRole, SubscriptionStatus, UserType };
export * from './enums.js';   // LeadStatus, LeadSource, SocialPostStatus, …
export type { User, Organization, Membership, Subscription, Business, Lead, … };
```

Prisma enums (`PlanId`, `SystemRole`, etc.) come from `@prisma/client`. Application-level constants (`LeadStatus.NEW`, `SocialPlatform.META`, …) live in `enums.ts`.

---

## Model groups

| Group | Models |
|-------|--------|
| **Auth & org** | `User`, `Organization`, `Membership`, `RefreshToken`, `UserProfile`, `TeamInvite`, `UserConsent`, `AuditLog` |
| **Billing** | `Subscription`, `PlanFeature` |
| **Business** | `Business`, `DailyMetrics` |
| **Leads & CRM** | `Lead`, `Interaction`, `Customer`, `CRMConnection` |
| **Email** | `EmailTemplate`, `EmailEvent` |
| **SEO & Google** | `SeoSiteProfile`, `SeoAuditRun`, `GoogleIntegration` |
| **Social** | `SocialConnection`, `SocialPost`, `SocialDataCache`, `WebhookLog` |
| **AI & content** | `MarketingPlan`, `ContentItem`, `AiManualPostImage`, `AiVideoJob`, `AiWebsiteJob` |

Enums in schema: `UserType`, `SystemRole`, `PlanId`, `SubscriptionStatus`.

---

## Commands

Run from `packages/db/` or via workspace scripts:

| Command | Script | Purpose |
|---------|--------|---------|
| `pnpm db:dev` | `prisma migrate dev` | Create/apply migrations in development |
| `pnpm db:migrate` | `prisma migrate deploy` | Apply migrations in CI/production |
| `pnpm build` | `prisma generate && tsc` | Generate client + compile |
| `pnpm typecheck` | `prisma generate && tsc --noEmit` | Type-check without emit |

**Note:** core-service also runs `prisma migrate deploy` on boot ([`services/core-service/src/server.ts`](../../services/core-service/src/server.ts)); failures are logged and ignored in dev.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NODE_ENV` | No | When `development`, enables query logging on the Prisma client |

---

## Agent rules

**Do**

- Change schema in `schema.prisma`, then create a migration with `pnpm db:dev`.
- Re-export new model types from `index.ts` if services need them explicitly.
- Add runtime enum constants to `enums.ts` when services need string literals outside Prisma.

**Don't**

- Import or depend on any service from this package.
- Run raw SQL outside Prisma unless performance-critical and documented.
- Skip migrations for schema changes — always generate and commit migration files.
- Instantiate multiple `PrismaClient` instances; use the exported `prisma` singleton.

---

## Common tasks

### Add a new model

1. Add model + relations in `schema.prisma`.
2. Run `pnpm db:dev --name describe_change` from `packages/db`.
3. Export types from `index.ts` if needed.
4. Update [types.md](types.md) and relevant service docs.

### Add an index or field

Same flow — schema change always requires a migration. Prefer nullable fields or defaults for zero-downtime deploys.
