import type { Job } from 'bullmq';
import {
  MarketingAutomationRunStatus,
  ContentItemStatus,
  prisma,
} from '@spacode/db';
import type { AiContentJobPayload } from '@spacode/types';
import { logger } from '@spacode/utils';
import Redis from 'ioredis';
import { getConfig } from '../config.js';
import { createTrackingSlug, generateContentPlan } from '../lib/ai-provider.js';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(getConfig().REDIS_URL, { maxRetriesPerRequest: null });
  }
  return redis;
}

function aiContentProgressChannel(runId: string): string {
  return `ai:content:${runId}`;
}

async function emit(runId: string, event: object): Promise<void> {
  await getRedis().publish(aiContentProgressChannel(runId), JSON.stringify(event));
}

export async function processAiContentJob(job: Job<AiContentJobPayload>): Promise<void> {
  const { runId, businessId, marketingPlanId, horizonDays } = job.data;

  await prisma.marketingAutomationRun.update({
    where: { id: runId },
    data: { status: MarketingAutomationRunStatus.RUNNING, startedAt: new Date() },
  });
  await emit(runId, { runId, status: 'generating', message: 'מתחיל יצירת תוכן...' });

  try {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const plan = await prisma.marketingPlan.findUnique({ where: { id: marketingPlanId } });
    if (!business) throw new Error('Business not found');

    const result = await generateContentPlan(
      {
        name: business.name,
        type: business.type,
        description: business.description,
        targetAudience: business.targetAudience,
        marketingGoal: business.marketingGoal,
        platforms: business.platforms,
        strategy: plan?.strategy ?? undefined,
      },
      horizonDays,
      plan?.strategy ?? undefined,
    );

    const items = await prisma.$transaction(
      result.items.map((item) =>
        prisma.contentItem.create({
          data: {
            businessId,
            marketingPlanId,
            idea: item.idea,
            hook: item.hook,
            description: item.description,
            cta: item.cta,
            platform: item.platform,
            status: ContentItemStatus.DRAFT,
            scheduledAt: new Date(item.scheduledAt),
            trackingSlug: createTrackingSlug(),
          },
        }),
      ),
    );

    await prisma.marketingPlan.update({
      where: { id: marketingPlanId },
      data: {
        strategy: result.strategy,
        status: 'active',
        contentPlan: { itemCount: items.length },
      },
    });

    await prisma.marketingAutomationRun.update({
      where: { id: runId },
      data: {
        status: MarketingAutomationRunStatus.COMPLETED,
        completedAt: new Date(),
        progress: { itemsGenerated: items.length, totalItems: items.length },
      },
    });
    await emit(runId, {
      runId,
      status: 'completed',
      itemsGenerated: items.length,
      totalItems: items.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI content generation failed';
    logger.error({ err, runId }, 'AI content job failed');
    await prisma.marketingAutomationRun.update({
      where: { id: runId },
      data: { status: MarketingAutomationRunStatus.FAILED, error: message, completedAt: new Date() },
    });
    await emit(runId, { runId, status: 'failed', message });
    throw err;
  }
}
