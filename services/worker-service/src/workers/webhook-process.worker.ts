import type { Job } from 'bullmq';
import { prisma } from '@spacode/db';
import type { WebhookProcessJobPayload } from '@spacode/types';
import { logger } from '@spacode/utils';
import { getConfig } from '../config.js';

async function resolveContentItemId(payload: Record<string, unknown>): Promise<string | undefined> {
  if (typeof payload.contentItemId === 'string') return payload.contentItemId;
  if (typeof payload.utm_content === 'string') {
    const bySlug = await prisma.contentItem.findFirst({
      where: { trackingSlug: payload.utm_content as string },
    });
    if (bySlug) return bySlug.id;
    const byId = await prisma.contentItem.findUnique({
      where: { id: payload.utm_content as string },
    });
    if (byId) return byId.id;
  }
  if (typeof payload.metaAdId === 'string') {
    const campaign = await prisma.metaAdCampaign.findFirst({
      where: { metaAdId: payload.metaAdId as string },
    });
    return campaign?.contentItemId ?? undefined;
  }
  return undefined;
}

export async function processWebhookJob(job: Job<WebhookProcessJobPayload>): Promise<void> {
  const log = await prisma.webhookLog.findUnique({ where: { id: job.data.logId } });
  if (!log || log.status === 'processed') return;

  try {
    const payload = (log.payload as Record<string, unknown> | null) ?? {};
    const businessId = log.businessId ?? (payload.businessId as string | undefined);
    const contentItemId = await resolveContentItemId(payload);

    if (businessId) {
      await fetch(`${getConfig().CORE_SERVICE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email,
          name: payload.name,
          phone: payload.phone,
          message: payload.message,
          businessId,
          source: payload.source ?? log.source,
          contentItemId,
          utm_content: contentItemId ?? payload.utm_content,
          sourceDetail: contentItemId ? `contentItem:${contentItemId}` : undefined,
        }),
      }).catch((err) => logger.warn({ err }, 'Lead forward failed'));
    }

    if (contentItemId) {
      await prisma.contentItem.update({
        where: { id: contentItemId },
        data: { leadCount: { increment: 1 } },
      });
    }

    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: 'processed', processedAt: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: 'failed', error: message },
    });
    throw err;
  }
}
