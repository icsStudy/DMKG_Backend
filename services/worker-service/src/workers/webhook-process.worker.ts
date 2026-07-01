import type { Job } from 'bullmq';
import { prisma } from '@spacode/db';
import type { WebhookProcessJobPayload } from '@spacode/types';
import { logger } from '@spacode/utils';
import { getConfig } from '../config.js';

export async function processWebhookJob(job: Job<WebhookProcessJobPayload>): Promise<void> {
  const log = await prisma.webhookLog.findUnique({ where: { id: job.data.logId } });
  if (!log || log.status === 'processed') return;

  try {
    const payload = log.payload as Record<string, unknown> | null;
    if (payload && log.businessId) {
      await fetch(`${getConfig().CORE_SERVICE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, businessId: log.businessId, source: log.source }),
      }).catch((err) => logger.warn({ err }, 'Lead forward failed'));
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
