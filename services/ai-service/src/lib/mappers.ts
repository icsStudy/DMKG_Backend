import type { ContentItemDto, MarketingPlanDto } from '@spacode/types';
import type { ContentItem, MarketingPlan } from '@spacode/db';

export function toContentItemDto(
  item: ContentItem & { socialPost?: { id: string } | null; metaAdCampaign?: { id: string } | null },
): ContentItemDto {
  return {
    id: item.id,
    businessId: item.businessId,
    marketingPlanId: item.marketingPlanId,
    idea: item.idea,
    hook: item.hook,
    description: item.description,
    cta: item.cta,
    platform: item.platform,
    status: item.status,
    mediaUrl: item.mediaUrl,
    trackingSlug: item.trackingSlug,
    leadCount: item.leadCount,
    whatsappTemplateId: item.whatsappTemplateId,
    scheduledAt: item.scheduledAt?.toISOString() ?? null,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    socialPostId: item.socialPost?.id ?? null,
    metaAdCampaignId: item.metaAdCampaign?.id ?? null,
    evergreenEnabled: item.evergreenEnabled,
    evergreenIntervalDays: item.evergreenIntervalDays,
    maxReposts: item.maxReposts,
    repostCount: item.repostCount,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toMarketingPlanDto(
  plan: MarketingPlan & { _count?: { contentItems: number } },
): MarketingPlanDto {
  return {
    id: plan.id,
    businessId: plan.businessId,
    strategy: plan.strategy,
    status: plan.status,
    horizonDays: plan.horizonDays,
    scheduledAt: plan.scheduledAt?.toISOString() ?? null,
    contentItemCount: plan._count?.contentItems ?? 0,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}
