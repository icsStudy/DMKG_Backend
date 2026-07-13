export const QUEUE_NAMES = {
  EMAIL_SEND: 'email-send',
  BULK_EMAIL: 'bulk-email',
  LEAD_SCORE: 'lead-score',
  SOCIAL_PUBLISH: 'social-publish',
  AI_VIDEO: 'ai-video',
  AI_WEBSITE: 'ai-website',
  AI_CONTENT: 'ai-content',
  GOOGLE_SYNC: 'google-sync',
  WEBHOOK_PROCESS: 'webhook-process',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface EmailJobPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  leadId?: string;
  messageId?: string;
}

export interface BulkEmailJobPayload {
  templateId: string;
  leadIds: string[];
  variables?: Record<string, string>;
}

export interface SocialPublishJobPayload {
  postId: string;
  businessId: string;
  platforms: string[];
  content: string;
  mediaUrl?: string;
}

export interface VideoGenerateJobPayload {
  jobId: string;
  provider: 'fal' | 'replicate_kling' | 'runway_gen4' | 'google_veo';
  prompt: string;
  imageUrls?: string[];
  durationSeconds?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  trim?: { startSec: number; endSec: number };
}

export interface LeadScoreJobPayload {
  leadId: string;
}

export interface GoogleSyncJobPayload {
  businessId: string;
}

export interface WebsiteGenerateJobPayload {
  jobId: string;
  businessId: string;
  mode?: 'fromBusiness' | 'hybrid' | 'custom';
  language?: 'he' | 'en' | 'dual';
  customPrompt?: string;
  designStyle?: string;
  prompt?: string;
  slug?: string;
}

export interface WebhookProcessJobPayload {
  logId: string;
}

export interface AiContentJobPayload {
  runId: string;
  businessId: string;
  marketingPlanId: string;
  horizonDays: 30 | 90;
}

export type LeadScoreJob = LeadScoreJobPayload;
export type EmailJob = EmailJobPayload;
export type BulkEmailJob = BulkEmailJobPayload;
export type SocialPublishJob = SocialPublishJobPayload;
export type AiVideoJob = VideoGenerateJobPayload;
export type AiWebsiteJob = WebsiteGenerateJobPayload;
export type GoogleSyncJob = GoogleSyncJobPayload;
export type WebhookProcessJob = WebhookProcessJobPayload;
export type AiContentJob = AiContentJobPayload;
