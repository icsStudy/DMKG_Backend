import { Queue, type ConnectionOptions } from 'bullmq';
import { QUEUE_NAMES, type SocialPublishJobPayload, type WebhookProcessJobPayload } from '@spacode/types';
import { getConfig } from '../config.js';

function getConnection(): ConnectionOptions {
  return { url: getConfig().REDIS_URL, maxRetriesPerRequest: null } as ConnectionOptions;
}

const connection = { connection: getConnection() };

export const socialPublishQueue = new Queue<SocialPublishJobPayload>(
  QUEUE_NAMES.SOCIAL_PUBLISH,
  connection,
);
export const webhookProcessQueue = new Queue<WebhookProcessJobPayload>(
  QUEUE_NAMES.WEBHOOK_PROCESS,
  connection,
);

export async function enqueueSocialPublish(job: SocialPublishJobPayload): Promise<void> {
  await socialPublishQueue.add('publish', job, { removeOnComplete: 100 });
}

export async function enqueueWebhookProcess(logId: string): Promise<void> {
  await webhookProcessQueue.add('process', { logId }, { removeOnComplete: 200 });
}
