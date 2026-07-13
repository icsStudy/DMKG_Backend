import type { Job } from 'bullmq';
import { ContentItemStatus, prisma, SocialPostStatus, SocialPlatform } from '@spacode/db';
import type { SocialPublishJobPayload } from '@spacode/types';
import { decrypt } from '@spacode/utils';
import { getRedis, publishProgressChannel } from '../lib/redis.js';
import { getConfig } from '../config.js';

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION ?? 'v21.0';

async function graphPost(path: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ id: string }>;
}

async function publishPlatform(
  platform: string,
  businessId: string,
  content: string,
  mediaUrl?: string,
): Promise<string> {
  const conn = await prisma.socialConnection.findUnique({
    where: { businessId_platform: { businessId, platform: SocialPlatform.META } },
  });
  if (!conn) throw new Error(`No connection for ${platform}`);

  const token = decrypt(conn.accessToken);
  const meta = conn.metadata as { pageId?: string } | null;
  const pageId = meta?.pageId ?? conn.accountId;
  if (!pageId) throw new Error('No Meta page configured');

  if (platform === 'instagram' && mediaUrl) {
    const igAccounts = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}?fields=instagram_business_account&access_token=${token}`,
    ).then((r) => r.json() as Promise<{ instagram_business_account?: { id: string } }>);
    const igId = igAccounts.instagram_business_account?.id;
    if (!igId) throw new Error('No Instagram business account linked');
    const container = await graphPost(`/${igId}/media`, token, {
      image_url: mediaUrl,
      caption: content,
    });
    const published = await graphPost(`/${igId}/media_publish`, token, {
      creation_id: container.id,
    });
    return published.id;
  }

  const result = await graphPost(`/${pageId}/feed`, token, { message: content, ...(mediaUrl && { link: mediaUrl }) });
  return result.id;
}

export async function processSocialPublishJob(job: Job<SocialPublishJobPayload>): Promise<void> {
  const { postId, businessId } = job.data;
  const post = await prisma.socialPost.findFirst({ where: { id: postId, businessId } });
  if (!post) return;

  const redis = getRedis();
  const channel = publishProgressChannel(postId);
  const platformResults: Record<string, { status: string; externalId?: string; error?: string }> = {};

  await prisma.socialPost.update({
    where: { id: postId },
    data: { status: SocialPostStatus.PUBLISHING },
  });

  const emit = async (event: object) => {
    await redis.publish(channel, JSON.stringify(event));
  };

  let anySuccess = false;
  let anyFailed = false;

  for (const platform of post.platforms) {
    await emit({ postId, platform, status: 'pending' });
    await emit({ postId, platform, status: 'uploading' });
    try {
      const conn = await prisma.socialConnection.findUnique({
        where: { businessId_platform: { businessId, platform: platform === 'instagram' ? SocialPlatform.META : platform } },
      });
      if (!conn && !process.env.META_APP_ID) {
        const externalId = `stub-${platform}-${Date.now()}`;
        platformResults[platform] = { status: 'published', externalId };
        anySuccess = true;
        await emit({ postId, platform, status: 'published', message: 'Stub publish (no credentials)' });
        continue;
      }
      if (!conn) throw new Error(`No connection for ${platform}`);

      const externalId = await publishPlatform(platform, businessId, post.content, post.mediaUrl ?? undefined);
      platformResults[platform] = { status: 'published', externalId };
      anySuccess = true;
      await emit({ postId, platform, status: 'published' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Publish failed';
      platformResults[platform] = { status: 'failed', error: message };
      anyFailed = true;
      await emit({ postId, platform, status: 'failed', message });
    }
  }

  const status =
    anySuccess && anyFailed
      ? SocialPostStatus.PARTIAL_FAILURE
      : anySuccess
        ? SocialPostStatus.PUBLISHED
        : SocialPostStatus.FAILED;

  await prisma.socialPost.update({
    where: { id: postId },
    data: {
      status,
      publishedAt: anySuccess ? new Date() : null,
      externalIds: platformResults as object,
      error: anyFailed && !anySuccess ? 'All platforms failed' : null,
    },
  });

  if (post.contentItemId) {
    await prisma.contentItem.update({
      where: { id: post.contentItemId },
      data: {
        status: anySuccess ? ContentItemStatus.PUBLISHED : ContentItemStatus.FAILED,
        publishedAt: anySuccess ? new Date() : null,
      },
    });
  }
}

export async function sweepStalePublishes(): Promise<number> {
  const cutoff = new Date(Date.now() - getConfig().SOCIAL_PUBLISH_MAX_MS);
  const stale = await prisma.socialPost.findMany({
    where: { status: SocialPostStatus.PUBLISHING, updatedAt: { lt: cutoff } },
    take: 50,
  });
  for (const post of stale) {
    await prisma.socialPost.update({
      where: { id: post.id },
      data: { status: SocialPostStatus.FAILED, error: 'Publish timed out' },
    });
  }
  return stale.length;
}

export async function enqueueDueScheduledPosts(): Promise<number> {
  const now = new Date();
  const due = await prisma.socialPost.findMany({
    where: { status: SocialPostStatus.SCHEDULED, scheduledAt: { lte: now } },
    take: 20,
  });

  const { Queue } = await import('bullmq');
  const { QUEUE_NAMES } = await import('@spacode/types');
  const queue = new Queue(QUEUE_NAMES.SOCIAL_PUBLISH, {
    connection: { url: getConfig().REDIS_URL, maxRetriesPerRequest: null },
  });

  for (const post of due) {
    await queue.add('publish', {
      postId: post.id,
      businessId: post.businessId,
      platforms: post.platforms,
      content: post.content,
      mediaUrl: post.mediaUrl ?? undefined,
    });
    await prisma.socialPost.update({
      where: { id: post.id },
      data: { status: SocialPostStatus.PUBLISHING },
    });
    if (post.contentItemId) {
      await prisma.contentItem.update({
        where: { id: post.contentItemId },
        data: { status: ContentItemStatus.PUBLISHING },
      });
    }
  }

  await queue.close();
  return due.length;
}
