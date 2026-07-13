export type MarketingHorizonDays = 30 | 90;

export interface GenerateContentPlanDto {
  horizonDays: MarketingHorizonDays;
  strategy?: string;
  platforms?: string[];
}

export interface GenerateContentItemDto {
  platform?: string;
  idea?: string;
  scheduledAt?: string;
  marketingPlanId?: string;
}

export interface UpdateContentItemDto {
  idea?: string;
  hook?: string;
  description?: string;
  cta?: string;
  platform?: string;
  status?: string;
  mediaUrl?: string;
  scheduledAt?: string | null;
  whatsappTemplateId?: string | null;
}

export interface MarketingPlanDto {
  id: string;
  businessId: string;
  strategy: string | null;
  status: string;
  horizonDays: number | null;
  scheduledAt: string | null;
  contentItemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentItemDto {
  id: string;
  businessId: string;
  marketingPlanId: string | null;
  idea: string | null;
  hook: string | null;
  description: string | null;
  cta: string | null;
  platform: string | null;
  status: string;
  mediaUrl: string | null;
  trackingSlug: string | null;
  leadCount: number;
  whatsappTemplateId: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  socialPostId: string | null;
  metaAdCampaignId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingCalendarItemDto extends ContentItemDto {
  hasActiveAd: boolean;
  hasWhatsAppTemplate: boolean;
}

export interface MarketingAutomationRunDto {
  id: string;
  businessId: string;
  marketingPlanId: string | null;
  horizonDays: number;
  status: string;
  progress: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

export interface AiContentProgressEvent {
  runId: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  message?: string;
  itemsGenerated?: number;
  totalItems?: number;
}

export interface MetaAdCampaignDto {
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
  startedAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMetaAdCampaignDto {
  contentItemId?: string;
  name: string;
  objective?: string;
  dailyBudget: number;
  currency?: string;
  adAccountId?: string;
  targeting?: Record<string, unknown>;
}

export interface MetaAdInsightsDto {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  currency: string;
}

export interface WhatsAppTemplateDto {
  id: string;
  businessId: string;
  metaTemplateId: string | null;
  name: string;
  language: string;
  category: string;
  status: string;
  components: unknown;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWhatsAppTemplateDto {
  name: string;
  language?: string;
  category?: string;
  body: string;
  header?: string;
  footer?: string;
}

export interface SendWhatsAppMessageDto {
  contentItemId?: string;
  templateId: string;
  to: string;
  variables?: string[];
}

export interface LeadAttributionDto {
  contentItemId?: string;
  socialPostId?: string;
  metaAdCampaignId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}

export interface SocialConnectionDto {
  platform: string;
  accountId: string | null;
  accountName: string | null;
  connected: boolean;
  metadata?: Record<string, unknown> | null;
}
