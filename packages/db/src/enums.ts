export const LeadStatus = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  CONVERTED: 'converted',
  LOST: 'lost',
} as const;

export type LeadStatusValue = (typeof LeadStatus)[keyof typeof LeadStatus];

export const LeadSource = {
  API: 'api',
  WEBHOOK: 'webhook',
  MANUAL: 'manual',
  CRM_SYNC: 'crm_sync',
  CONTACT_FORM: 'contact_form',
  WHATSAPP: 'whatsapp',
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  LINKEDIN: 'linkedin',
  TWITTER: 'twitter',
  YOUTUBE: 'youtube',
} as const;

export type LeadSourceValue = (typeof LeadSource)[keyof typeof LeadSource];

export const SocialPostStatus = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  FAILED: 'failed',
  PARTIAL_FAILURE: 'partial_failure',
} as const;

export const SocialPlatform = {
  META: 'meta',
  TIKTOK: 'tiktok',
  LINKEDIN: 'linkedin',
  TWITTER: 'twitter',
  YOUTUBE: 'youtube',
  WHATSAPP: 'whatsapp',
} as const;

export type SocialPlatformValue = (typeof SocialPlatform)[keyof typeof SocialPlatform];

export const ContentItemStatus = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  FAILED: 'failed',
} as const;

export type ContentItemStatusValue = (typeof ContentItemStatus)[keyof typeof ContentItemStatus];

export const MetaAdCampaignStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type MetaAdCampaignStatusValue =
  (typeof MetaAdCampaignStatus)[keyof typeof MetaAdCampaignStatus];

export const WhatsAppTemplateStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type WhatsAppTemplateStatusValue =
  (typeof WhatsAppTemplateStatus)[keyof typeof WhatsAppTemplateStatus];

export const MarketingAutomationRunStatus = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type MarketingAutomationRunStatusValue =
  (typeof MarketingAutomationRunStatus)[keyof typeof MarketingAutomationRunStatus];

export const AiVideoStatus = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  GENERATING: 'generating',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export const AiWebsiteStatus = {
  QUEUED: 'queued',
  GENERATING: 'generating',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export const EmailEventType = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  OPENED: 'opened',
  CLICKED: 'clicked',
  BOUNCED: 'bounced',
  FAILED: 'failed',
} as const;

export const MembershipRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

/** Alias for services expecting PlanTier */
export { PlanId as PlanTier } from '@prisma/client';
