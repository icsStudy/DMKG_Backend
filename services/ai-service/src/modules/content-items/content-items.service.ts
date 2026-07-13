import { ContentItemStatus, prisma } from '@spacode/db';
import type { GenerateContentItemDto, UpdateContentItemDto } from '@spacode/types';
import { Errors } from '@spacode/utils';
import { createTrackingSlug, generateSingleItem } from '../../lib/ai-provider.js';
import { toContentItemDto } from '../../lib/mappers.js';

export async function listContentItems(
  businessId: string,
  opts: { status?: string; marketingPlanId?: string; skip?: number; limit?: number },
) {
  const where = {
    businessId,
    ...(opts.status && { status: opts.status }),
    ...(opts.marketingPlanId && { marketingPlanId: opts.marketingPlanId }),
  };
  const [items, total] = await Promise.all([
    prisma.contentItem.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      skip: opts.skip ?? 0,
      take: opts.limit ?? 100,
      include: { socialPost: { select: { id: true } }, metaAdCampaign: { select: { id: true } } },
    }),
    prisma.contentItem.count({ where }),
  ]);
  return { items: items.map(toContentItemDto), total };
}

export async function getCalendar(businessId: string, from: string, to: string) {
  const items = await prisma.contentItem.findMany({
    where: {
      businessId,
      scheduledAt: { gte: new Date(from), lte: new Date(to) },
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      socialPost: { select: { id: true } },
      metaAdCampaign: { select: { id: true, status: true } },
      whatsappTemplate: { select: { id: true, status: true } },
    },
  });
  return items.map((item) => ({
    ...toContentItemDto(item),
    hasActiveAd: item.metaAdCampaign?.status === 'active',
    hasWhatsAppTemplate: !!item.whatsappTemplateId,
  }));
}

export async function getContentItem(businessId: string, itemId: string) {
  const item = await prisma.contentItem.findFirst({
    where: { id: itemId, businessId },
    include: { socialPost: { select: { id: true } }, metaAdCampaign: { select: { id: true } } },
  });
  if (!item) throw Errors.notFound('Content item not found');
  return toContentItemDto(item);
}

export async function generateContentItem(businessId: string, data: GenerateContentItemDto) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw Errors.notFound('Business not found');

  const generated = await generateSingleItem(
    {
      name: business.name,
      type: business.type,
      description: business.description,
      targetAudience: business.targetAudience,
      marketingGoal: business.marketingGoal,
      platforms: business.platforms,
    },
    {
      platform: data.platform,
      idea: data.idea,
      scheduledAt: data.scheduledAt,
    },
  );

  const item = await prisma.contentItem.create({
    data: {
      businessId,
      marketingPlanId: data.marketingPlanId,
      idea: generated.idea,
      hook: generated.hook,
      description: generated.description,
      cta: generated.cta,
      platform: generated.platform,
      status: ContentItemStatus.DRAFT,
      scheduledAt: new Date(generated.scheduledAt),
      trackingSlug: createTrackingSlug(),
    },
    include: { socialPost: { select: { id: true } }, metaAdCampaign: { select: { id: true } } },
  });
  return toContentItemDto(item);
}

export async function updateContentItem(
  businessId: string,
  itemId: string,
  data: UpdateContentItemDto,
) {
  const existing = await prisma.contentItem.findFirst({ where: { id: itemId, businessId } });
  if (!existing) throw Errors.notFound('Content item not found');

  const item = await prisma.contentItem.update({
    where: { id: itemId },
    data: {
      idea: data.idea,
      hook: data.hook,
      description: data.description,
      cta: data.cta,
      platform: data.platform,
      status: data.status,
      mediaUrl: data.mediaUrl,
      whatsappTemplateId: data.whatsappTemplateId ?? undefined,
      scheduledAt:
        data.scheduledAt === null ? null : data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    },
    include: { socialPost: { select: { id: true } }, metaAdCampaign: { select: { id: true } } },
  });
  return toContentItemDto(item);
}

export async function deleteContentItem(businessId: string, itemId: string) {
  const existing = await prisma.contentItem.findFirst({ where: { id: itemId, businessId } });
  if (!existing) throw Errors.notFound('Content item not found');
  await prisma.contentItem.delete({ where: { id: itemId } });
}

export async function getContentItemLeads(businessId: string, itemId: string) {
  const item = await prisma.contentItem.findFirst({ where: { id: itemId, businessId } });
  if (!item) throw Errors.notFound('Content item not found');
  const leads = await prisma.lead.findMany({
    where: { businessId, contentItemId: itemId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return leads.map((l) => ({
    id: l.id,
    source: l.source,
    sourceDetail: l.sourceDetail,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
  }));
}
