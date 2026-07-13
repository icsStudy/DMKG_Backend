import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import { getRedis, publishProgressChannel } from '../../lib/redis.js';
import * as svc from './publish.service.js';
import { enqueueSocialPublish } from '../../lib/queue.js';
import { prisma, SocialPostStatus } from '@spacode/db';

export const publishRouter = Router();
publishRouter.use(gatewayContext, requireAuth, requireBusiness);

publishRouter.post(
  '/publish',
  asyncHandler(async (req, res) => {
    const post = await svc.publishPost(req.business!.id, req.body);
    const isScheduled = post.status === SocialPostStatus.SCHEDULED;

    if (isScheduled) {
      success(res, { postId: post.id, status: post.status, scheduled: true });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const redis = getRedis();
    const channel = publishProgressChannel(post.id);
    const sub = redis.duplicate();
    await sub.subscribe(channel);

    const done = new Set<string>();
    const finish = () => {
      if (!res.writableEnded) res.end();
      void sub.unsubscribe(channel);
      void sub.quit();
    };

    sub.on('message', (_ch, message) => {
      res.write(`data: ${message}\n\n`);
      try {
        const event = JSON.parse(message) as { platform: string; status: string };
        if (event.status === 'published' || event.status === 'failed') {
          done.add(event.platform);
        }
        if (done.size >= post.platforms.length) {
          setTimeout(finish, 100);
        }
      } catch {
        /* ignore */
      }
    });

    req.on('close', finish);

    setTimeout(async () => {
      const current = await prisma.socialPost.findUnique({ where: { id: post.id } });
      if (current && current.status === SocialPostStatus.PUBLISHING) {
        for (const platform of post.platforms) {
          res.write(
            `data: ${JSON.stringify({ postId: post.id, platform, status: 'pending' })}\n\n`,
          );
        }
      }
    }, 500);
  }),
);

publishRouter.get(
  '/posts',
  asyncHandler(async (req, res) => {
    success(
      res,
      await svc.listPosts(req.business!.id, {
        status: req.query.status as string | undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
      }),
    );
  }),
);

publishRouter.get(
  '/posts/:postId/progress',
  asyncHandler(async (req, res) => {
    const post = await svc.getPost(req.business!.id, req.params.postId);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const redis = getRedis();
    const channel = publishProgressChannel(post.id);
    const sub = redis.duplicate();
    await sub.subscribe(channel);

    sub.on('message', (_ch, message) => {
      res.write(`data: ${message}\n\n`);
    });

    if (post.status === SocialPostStatus.PUBLISHED || post.status === SocialPostStatus.FAILED) {
      for (const platform of post.platforms) {
        res.write(
          `data: ${JSON.stringify({ postId: post.id, platform, status: post.status === SocialPostStatus.PUBLISHED ? 'published' : 'failed' })}\n\n`,
        );
      }
      res.end();
      await sub.quit();
      return;
    }

    req.on('close', () => {
      void sub.unsubscribe(channel);
      void sub.quit();
    });
  }),
);

export async function enqueueScheduledPost(postId: string, businessId: string): Promise<void> {
  const post = await prisma.socialPost.findFirst({ where: { id: postId, businessId } });
  if (!post) return;
  await enqueueSocialPublish({
    postId: post.id,
    businessId,
    platforms: post.platforms,
    content: post.content,
    mediaUrl: post.mediaUrl ?? undefined,
  });
  await prisma.socialPost.update({
    where: { id: postId },
    data: { status: SocialPostStatus.PUBLISHING },
  });
}
