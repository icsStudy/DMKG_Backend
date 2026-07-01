import { Queue, type ConnectionOptions } from 'bullmq';
import {
  QUEUE_NAMES,
  type EmailJobPayload,
  type BulkEmailJobPayload,
  type LeadScoreJobPayload,
} from '@spacode/types';
import { getConfig } from '../config.js';

function getConnection(): ConnectionOptions {
  return { url: getConfig().REDIS_URL, maxRetriesPerRequest: null } as ConnectionOptions;
}

const connection = { connection: getConnection() };

export const leadScoreQueue = new Queue<LeadScoreJobPayload>(QUEUE_NAMES.LEAD_SCORE, connection);
export const emailSendQueue = new Queue<EmailJobPayload>(QUEUE_NAMES.EMAIL_SEND, connection);
export const bulkEmailQueue = new Queue<BulkEmailJobPayload>(QUEUE_NAMES.BULK_EMAIL, connection);

export async function enqueueLeadScore(leadId: string): Promise<void> {
  await leadScoreQueue.add('score', { leadId }, { removeOnComplete: 100 });
}

export async function enqueueEmail(job: EmailJobPayload): Promise<void> {
  await emailSendQueue.add('send', job, { removeOnComplete: 200 });
}

export async function enqueueBulkEmail(job: BulkEmailJobPayload): Promise<void> {
  await bulkEmailQueue.add('bulk', job, { removeOnComplete: 50 });
}
