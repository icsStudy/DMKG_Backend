import type { Job } from 'bullmq';
import { ContentItemStatus, prisma, SocialPostStatus } from '@spacode/db';
import type { SocialPublishJobPayload } from '@spacode/types';
import { getRedis, publishProgressChannel } from '../lib/redis.js';
import { getConfig } from '../config.js';
import {
  connectionPlatformKey,
  pollTikTokInFlight,
  postMetaFirstComment,
  publishToPlatform,
} from '../lib/platform-publish.js';

function hasAnyCredentials(): boolean {
  return !!(
    process.env.META_APP_ID ||
    process.env.TIKTOK_CLIENT_KEY ||
    process.env.LINKEDIN_CLIENT_ID ||
    process.env.X_CLIENT_ID ||
    process.env.YOUTUBE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID
  );
}

export async function processSocialPublishJob(job: Job<SocialPublishJobPayload>): Promise<void> {
  const { postId, businessId } = job.data;
  const post = await prisma.socialPost.findFirst({ where: { id: postId, businessId } });
  if (!post) return;

  const redis = getRedis();
  const channel = publishProgressChannel(postId);
  const platformResults: Record<string, { status: string; externalId?: string; error?: string; publishId?: string }> =
    (post.externalIds as Record<string, { status: string; externalId?: string; error?: string; publishId?: string }>) ?? {};

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
      const connKey = connectionPlatformKey(platform);
      const conn = await prisma.socialConnection.findUnique({
        where: { businessId_platform: { businessId, platform: connKey } },
      });

      if (!conn && (!hasAnyCredentials() || process.env.E2E_STUB_PUBLISH === '1')) {
        const externalId = `stub-${platform}-${Date.now()}`;
        platformResults[platform] = { status: 'published', externalId };
        anySuccess = true;
        await emit({ postId, platform, status: 'published', message: 'Stub publish (no credentials)' });
        continue;
      }
      if (!conn) throw new Error(`No connection for ${platform}`);

      const externalId = await publishToPlatform(
        platform,
        conn,
        post.content,
        post.mediaUrl ?? undefined,
      );

      const isTikTokPending =
        platform === 'tiktok' && externalId.startsWith('v_') === false && !externalId.match(/^\d+$/);

      platformResults[platform] = {
        status: 'published',
        externalId,
        ...(platform === 'tiktok' && isTikTokPending ? { publishId: externalId } : {}),
      };
      anySuccess = true;
      await emit({ postId, platform, status: 'published' });

      if (post.firstComment && (platform === 'meta' || platform === 'facebook')) {
        try {
          await postMetaFirstComment(conn, externalId, post.firstComment);
        } catch {
          /* first comment is best-effort */
        }
      }
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
      firstCommentPostedAt: post.firstComment && anySuccess ? new Date() : null,
    },
  });

  if (post.contentItemId) {
    await prisma.contentItem.update({
      where: { id: post.contentItemId },
      data: {
        status: anySuccess ? ContentItemStatus.PUBLISHED : ContentItemStatus.FAILED,
        publishedAt: anySuccess ? new Date() : null,
        lastRepostedAt: anySuccess ? new Date() : undefined,
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

  let swept = 0;
  for (const post of stale) {
    const externalIds = post.externalIds as Record<
      string,
      { publishId?: string; status?: string; externalId?: string }
    > | null;
    let resolved = false;

    if (externalIds) {
      for (const [platform, result] of Object.entries(externalIds)) {
        if (platform === 'tiktok' && result.publishId && !result.externalId?.match(/^\d+$/)) {
          const conn = await prisma.socialConnection.findUnique({
            where: { businessId_platform: { businessId: post.businessId, platform: 'tiktok' } },
          });
          if (conn) {
            const finalId = await pollTikTokInFlight(conn, result.publishId);
            if (finalId) {
              externalIds[platform] = { ...result, externalId: finalId, status: 'published' };
              await prisma.socialPost.update({
                where: { id: post.id },
                data: { status: SocialPostStatus.PUBLISHED, publishedAt: new Date(), externalIds },
              });
              resolved = true;
              swept++;
              break;
            }
          }
        }
      }
    }

    if (!resolved) {
      await prisma.socialPost.update({
        where: { id: post.id },
        data: { status: SocialPostStatus.FAILED, error: 'Publish timed out' },
      });
      swept++;
    }
  }
  return swept;
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

export async function enqueueEvergreenReposts(): Promise<number> {
  const now = new Date();
  const items = await prisma.contentItem.findMany({
    where: {
      evergreenEnabled: true,
      evergreenIntervalDays: { not: null },
      socialPost: { isNot: null },
    },
    take: 20,
  });

  let enqueued = 0;
  const { Queue } = await import('bullmq');
  const { QUEUE_NAMES } = await import('@spacode/types');
  const queue = new Queue(QUEUE_NAMES.SOCIAL_PUBLISH, {
    connection: { url: getConfig().REDIS_URL, maxRetriesPerRequest: null },
  });

  for (const item of items) {
    if (!item.evergreenIntervalDays) continue;
    const last = item.lastRepostedAt ?? item.publishedAt ?? item.createdAt;
    const nextDue = new Date(last.getTime() + item.evergreenIntervalDays * 86400000);
    if (nextDue > now) continue;
    if (item.maxReposts != null && item.repostCount >= item.maxReposts) continue;

    const existingPost = await prisma.socialPost.findFirst({
      where: { contentItemId: item.id },
    });
    if (!existingPost) continue;

    const newPost = await prisma.socialPost.create({
      data: {
        businessId: item.businessId,
        contentItemId: null,
        content: existingPost.content,
        mediaUrl: existingPost.mediaUrl ?? item.mediaUrl,
        platforms: existingPost.platforms,
        status: SocialPostStatus.SCHEDULED,
        scheduledAt: now,
      },
    });

    await queue.add('publish', {
      postId: newPost.id,
      businessId: newPost.businessId,
      platforms: newPost.platforms,
      content: newPost.content,
      mediaUrl: newPost.mediaUrl ?? undefined,
    });

    await prisma.contentItem.update({
      where: { id: item.id },
      data: { repostCount: { increment: 1 }, lastRepostedAt: now },
    });
    enqueued++;
  }

  await queue.close();
  return enqueued;
}
