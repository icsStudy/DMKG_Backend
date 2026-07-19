import { ContentItemStatus, prisma, SocialPostStatus } from '@spacode/db';
import type { PublishPostDto } from '@spacode/types';
import { Errors } from '@spacode/utils';
import { enqueueSocialPublish } from '../../lib/queue.js';

export async function publishPost(businessId: string, data: PublishPostDto) {
  if (!data.content?.trim()) throw Errors.validation('content is required');
  const platforms = data.platforms?.length ? data.platforms : ['meta'];
  const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
  const isScheduled = scheduledAt && scheduledAt.getTime() > Date.now();

  let contentItemId = data.contentItemId;
  if (contentItemId) {
    const item = await prisma.contentItem.findFirst({
      where: { id: contentItemId, businessId },
    });
    if (!item) throw Errors.notFound('Content item not found');
  }

  const post = await prisma.socialPost.create({
    data: {
      businessId,
      contentItemId: contentItemId ?? undefined,
      content: data.content,
      mediaUrl: data.mediaUrl ?? data.mediaUrls?.[0],
      platforms,
      firstComment: data.firstComment,
      status: isScheduled ? SocialPostStatus.SCHEDULED : SocialPostStatus.DRAFT,
      scheduledAt,
    },
  });

  if (contentItemId) {
    await prisma.contentItem.update({
      where: { id: contentItemId },
      data: {
        status: isScheduled ? ContentItemStatus.SCHEDULED : ContentItemStatus.PUBLISHING,
      },
    });
  }

  if (!isScheduled) {
    await enqueueSocialPublish({
      postId: post.id,
      businessId,
      platforms,
      content: data.content,
      mediaUrl: data.mediaUrl ?? data.mediaUrls?.[0],
    });
    await prisma.socialPost.update({
      where: { id: post.id },
      data: { status: SocialPostStatus.PUBLISHING },
    });
  }

  return post;
}

export async function listPosts(
  businessId: string,
  opts: { status?: string; from?: string; to?: string },
) {
  return prisma.socialPost.findMany({
    where: {
      businessId,
      ...(opts.status && { status: opts.status }),
      ...(opts.from &&
        opts.to && {
          scheduledAt: { gte: new Date(opts.from), lte: new Date(opts.to) },
        }),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function getPost(businessId: string, postId: string) {
  const post = await prisma.socialPost.findFirst({ where: { id: postId, businessId } });
  if (!post) throw Errors.notFound('Post not found');
  return post;
}
