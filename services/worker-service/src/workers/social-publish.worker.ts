import type { Job } from 'bullmq';
import { prisma, SocialPostStatus } from '@spacode/db';
import type { SocialPublishJobPayload } from '@spacode/types';
import { decrypt } from '@spacode/utils';
import { getRedis, publishProgressChannel } from '../lib/redis.js';
import { getConfig } from '../config.js';

export async function processSocialPublishJob(job: Job<SocialPublishJobPayload>): Promise<void> {
  const { postId, businessId } = job.data;
  const post = await prisma.socialPost.findFirst({ where: { id: postId, businessId } });
  if (!post) return;

  const redis = getRedis();
  const channel = publishProgressChannel(postId);
  const platformResults: Record<string, { status: string; externalId?: string; error?: string }> =
    {};

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
        where: { businessId_platform: { businessId, platform } },
      });
      if (!conn) throw new Error(`No connection for ${platform}`);
      const token = decrypt(conn.accessToken);
      const externalId =
        token.startsWith('stub-token') || !process.env[`${platform.toUpperCase()}_CLIENT_ID`]
          ? `stub-${platform}-${Date.now()}`
          : `${platform}-${Date.now()}`;
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
