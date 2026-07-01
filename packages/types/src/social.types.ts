export type Platform = 'meta' | 'tiktok' | 'linkedin' | 'twitter' | 'youtube';

export interface PublishPayload {
  postId: string;
  businessId: string;
  platforms: Platform[];
  content: string;
  mediaUrl?: string;
}

export interface PlatformPublishResult {
  platform: Platform;
  status: 'success' | 'failed';
  externalId?: string;
  error?: string;
}

export interface PublishPostDto {
  content: string;
  platforms: Platform[];
  mediaUrls?: string[];
  scheduledAt?: string;
}

export interface PublishProgressEvent {
  postId: string;
  platform: string;
  status: 'pending' | 'uploading' | 'published' | 'failed';
  message?: string;
}
