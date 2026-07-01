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
} as const;

export type SocialPlatformValue = (typeof SocialPlatform)[keyof typeof SocialPlatform];

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
