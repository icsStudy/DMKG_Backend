import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { Prisma, PlanId, SystemRole, SubscriptionStatus, UserType } from '@prisma/client';
export * from './enums.js';
export type {
  User,
  Organization,
  Membership,
  Subscription,
  Business,
  Lead,
  Interaction,
  Customer,
  EmailEvent,
  SocialPost,
  SocialConnection,
  AiVideoJob,
  AiWebsiteJob,
  MarketingPlan,
  ContentItem,
  MetaAdCampaign,
  WhatsAppTemplate,
  MarketingAutomationRun,
  TeamInvite,
  UserConsent,
  PlanFeature,
  CRMConnection,
} from '@prisma/client';
