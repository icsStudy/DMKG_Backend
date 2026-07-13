import { MetaAdCampaignStatus, prisma } from '@spacode/db';
import type { CreateMetaAdCampaignDto, MetaAdCampaignDto, MetaAdInsightsDto } from '@spacode/types';
import { decrypt, Errors } from '@spacode/utils';
import { graphGet, graphPost } from '../../lib/meta-client.js';
import { getConnectionToken } from '../connections/connections.service.js';

function toDto(c: {
  id: string;
  businessId: string;
  contentItemId: string | null;
  metaCampaignId: string | null;
  metaAdSetId: string | null;
  metaAdId: string | null;
  name: string;
  objective: string;
  status: string;
  dailyBudget: number | null;
  currency: string;
  startedAt: Date | null;
  pausedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): MetaAdCampaignDto {
  return {
    id: c.id,
    businessId: c.businessId,
    contentItemId: c.contentItemId,
    metaCampaignId: c.metaCampaignId,
    metaAdSetId: c.metaAdSetId,
    metaAdId: c.metaAdId,
    name: c.name,
    objective: c.objective,
    status: c.status,
    dailyBudget: c.dailyBudget,
    currency: c.currency,
    startedAt: c.startedAt?.toISOString() ?? null,
    pausedAt: c.pausedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

async function getAdAccountId(businessId: string, override?: string): Promise<string> {
  if (override) return override.startsWith('act_') ? override : `act_${override}`;
  const conn = await prisma.socialConnection.findUnique({
    where: { businessId_platform: { businessId, platform: 'meta' } },
  });
  const meta = conn?.metadata as { adAccountId?: string } | null;
  if (meta?.adAccountId) return meta.adAccountId.startsWith('act_') ? meta.adAccountId : `act_${meta.adAccountId}`;
  const token = await getConnectionToken(businessId, 'meta');
  const userTokenConn = conn?.metadata as { userToken?: string } | null;
  const userToken = userTokenConn?.userToken ? decrypt(userTokenConn.userToken) : token;
  const accounts = await graphGet<{ data: { id: string; account_id: string }[] }>(
    '/me/adaccounts',
    userToken,
    { fields: 'id,account_id' },
  );
  const account = accounts.data?.[0];
  if (!account) throw Errors.validation('No Meta ad account connected');
  return account.id;
}

export async function listCampaigns(businessId: string): Promise<MetaAdCampaignDto[]> {
  const campaigns = await prisma.metaAdCampaign.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
  });
  return campaigns.map(toDto);
}

export async function createCampaign(
  businessId: string,
  data: CreateMetaAdCampaignDto,
): Promise<MetaAdCampaignDto> {
  const adAccountId = await getAdAccountId(businessId, data.adAccountId);
  const token = await getConnectionToken(businessId, 'meta');

  let contentText = data.name;
  let link: string | undefined;
  if (data.contentItemId) {
    const item = await prisma.contentItem.findFirst({
      where: { id: data.contentItemId, businessId },
    });
    if (item) {
      contentText = item.description ?? item.hook ?? data.name;
      link = item.trackingSlug ? `https://spacode.co.il/p/${item.trackingSlug}` : undefined;
    }
  }

  const metaCampaign = await graphPost<{ id: string }>(`/${adAccountId}/campaigns`, token, {
    name: data.name,
    objective: data.objective ?? 'OUTCOME_LEADS',
    status: 'PAUSED',
    special_ad_categories: [],
  });

  const metaAdSet = await graphPost<{ id: string }>(`/${adAccountId}/adsets`, token, {
    name: `${data.name} — AdSet`,
    campaign_id: metaCampaign.id,
    daily_budget: (data.dailyBudget ?? 50) * 100,
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LEAD_GENERATION',
    targeting: data.targeting ?? { geo_locations: { countries: ['IL'] } },
    status: 'PAUSED',
  });

  const creative = await graphPost<{ id: string }>(`/${adAccountId}/adcreatives`, token, {
    name: `${data.name} — Creative`,
    object_story_spec: {
      page_id: (await prisma.socialConnection.findUnique({
        where: { businessId_platform: { businessId, platform: 'meta' } },
      }))?.accountId,
      link_data: {
        message: contentText,
        link: link ?? 'https://spacode.co.il',
        call_to_action: { type: 'LEARN_MORE' },
      },
    },
  });

  const metaAd = await graphPost<{ id: string }>(`/${adAccountId}/ads`, token, {
    name: `${data.name} — Ad`,
    adset_id: metaAdSet.id,
    creative: { creative_id: creative.id },
    status: 'PAUSED',
  });

  const campaign = await prisma.metaAdCampaign.create({
    data: {
      businessId,
      contentItemId: data.contentItemId,
      metaCampaignId: metaCampaign.id,
      metaAdSetId: metaAdSet.id,
      metaAdId: metaAd.id,
      name: data.name,
      objective: data.objective ?? 'OUTCOME_LEADS',
      status: MetaAdCampaignStatus.DRAFT,
      dailyBudget: data.dailyBudget,
      currency: data.currency ?? 'ILS',
      externalIds: { adAccountId, creativeId: creative.id },
    },
  });

  return toDto(campaign);
}

export async function activateCampaign(businessId: string, campaignId: string) {
  const campaign = await prisma.metaAdCampaign.findFirst({
    where: { id: campaignId, businessId },
  });
  if (!campaign?.metaCampaignId) throw Errors.notFound('Campaign not found');

  const token = await getConnectionToken(businessId, 'meta');
  await graphPost(`/${campaign.metaCampaignId}`, token, { status: 'ACTIVE' });
  if (campaign.metaAdSetId) {
    await graphPost(`/${campaign.metaAdSetId}`, token, { status: 'ACTIVE' });
  }
  if (campaign.metaAdId) {
    await graphPost(`/${campaign.metaAdId}`, token, { status: 'ACTIVE' });
  }

  const updated = await prisma.metaAdCampaign.update({
    where: { id: campaignId },
    data: { status: MetaAdCampaignStatus.ACTIVE, startedAt: new Date(), pausedAt: null },
  });
  return toDto(updated);
}

export async function pauseCampaign(businessId: string, campaignId: string) {
  const campaign = await prisma.metaAdCampaign.findFirst({
    where: { id: campaignId, businessId },
  });
  if (!campaign?.metaCampaignId) throw Errors.notFound('Campaign not found');

  const token = await getConnectionToken(businessId, 'meta');
  await graphPost(`/${campaign.metaCampaignId}`, token, { status: 'PAUSED' });

  const updated = await prisma.metaAdCampaign.update({
    where: { id: campaignId },
    data: { status: MetaAdCampaignStatus.PAUSED, pausedAt: new Date() },
  });
  return toDto(updated);
}

export async function getCampaignInsights(
  businessId: string,
  campaignId: string,
): Promise<MetaAdInsightsDto> {
  const campaign = await prisma.metaAdCampaign.findFirst({
    where: { id: campaignId, businessId },
  });
  if (!campaign?.metaCampaignId) throw Errors.notFound('Campaign not found');

  const token = await getConnectionToken(businessId, 'meta');
  const insights = await graphGet<{
    data: { spend: string; impressions: string; clicks: string; actions?: { action_type: string; value: string }[] }[];
  }>(`/${campaign.metaCampaignId}/insights`, token, {
    fields: 'spend,impressions,clicks,actions',
  });

  const row = insights.data?.[0];
  const leads =
    row?.actions?.find((a) => a.action_type === 'lead')?.value ?? '0';

  return {
    spend: Number(row?.spend ?? 0),
    impressions: Number(row?.impressions ?? 0),
    clicks: Number(row?.clicks ?? 0),
    leads: Number(leads),
    currency: campaign.currency,
  };
}

export async function listAdAccounts(businessId: string) {
  const conn = await prisma.socialConnection.findUnique({
    where: { businessId_platform: { businessId, platform: 'meta' } },
  });
  if (!conn) throw Errors.notFound('Meta not connected');
  const meta = conn.metadata as { userToken?: string } | null;
  const token = meta?.userToken ? decrypt(meta.userToken) : decrypt(conn.accessToken);
  const accounts = await graphGet<{ data: { id: string; name: string; account_id: string }[] }>(
    '/me/adaccounts',
    token,
    { fields: 'id,name,account_id' },
  );
  return accounts.data ?? [];
}
