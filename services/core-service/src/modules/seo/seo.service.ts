import { prisma } from '@spacode/db';
import { Errors } from '@spacode/utils';

export async function getOrCreateProfile(businessId: string) {
  let profile = await prisma.seoSiteProfile.findUnique({ where: { businessId } });
  if (!profile) {
    profile = await prisma.seoSiteProfile.create({ data: { businessId } });
  }
  return profile;
}

export async function updateProfile(
  businessId: string,
  data: { siteUrl?: string; keywords?: string[]; metadata?: object },
) {
  await getOrCreateProfile(businessId);
  return prisma.seoSiteProfile.update({
    where: { businessId },
    data: {
      siteUrl: data.siteUrl,
      keywords: data.keywords,
      metadata: data.metadata as never,
    },
  });
}

export async function runAudit(businessId: string) {
  const findings = {
    issues: [
      { severity: 'medium', message: 'Missing meta description' },
      { severity: 'low', message: 'Images without alt text' },
    ],
  };
  return prisma.seoAuditRun.create({
    data: {
      businessId,
      score: 72,
      report: findings,
      status: 'completed',
      completedAt: new Date(),
    },
  });
}

export async function listAudits(businessId: string) {
  return prisma.seoAuditRun.findMany({
    where: { businessId },
    orderBy: { startedAt: 'desc' },
    take: 20,
  });
}

export async function connectGoogle(businessId: string, tokens: {
  accessToken: string;
  refreshToken?: string;
  ga4PropertyId?: string;
  gscSiteUrl?: string;
}) {
  return prisma.googleIntegration.upsert({
    where: { businessId },
    create: {
      businessId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      ga4PropertyId: tokens.ga4PropertyId,
      gscSiteUrl: tokens.gscSiteUrl,
    },
    update: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      ga4PropertyId: tokens.ga4PropertyId,
      gscSiteUrl: tokens.gscSiteUrl,
    },
  });
}

export async function getGoogleIntegration(businessId: string) {
  return prisma.googleIntegration.findUnique({ where: { businessId } });
}

export async function syncGoogle(businessId: string) {
  const integration = await prisma.googleIntegration.findUnique({ where: { businessId } });
  if (!integration) throw Errors.notFound('Google integration not connected');

  const metadata = {
    ga4Summary: { sessions: 1200, users: 890 },
    gscSummary: { clicks: 340, impressions: 8900 },
    lastSyncedAt: new Date().toISOString(),
  };

  return prisma.googleIntegration.update({
    where: { businessId },
    data: { metadata: metadata as never },
  });
}
