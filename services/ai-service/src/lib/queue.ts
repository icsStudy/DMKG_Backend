import { Queue, type ConnectionOptions } from 'bullmq';
import {
  QUEUE_NAMES,
  type AiContentJobPayload,
  type WebsiteGenerateJobPayload,
} from '@spacode/types';
import { getConfig } from '../config.js';

function getConnection(): ConnectionOptions {
  return { url: getConfig().REDIS_URL, maxRetriesPerRequest: null } as ConnectionOptions;
}

const connection = { connection: getConnection() };

export const aiContentQueue = new Queue<AiContentJobPayload>(QUEUE_NAMES.AI_CONTENT, connection);
export const aiWebsiteQueue = new Queue<WebsiteGenerateJobPayload>(QUEUE_NAMES.AI_WEBSITE, connection);

export async function enqueueAiContent(job: AiContentJobPayload): Promise<void> {
  await aiContentQueue.add('generate', job, { removeOnComplete: 50 });
}

export async function enqueueAiWebsite(job: WebsiteGenerateJobPayload): Promise<void> {
  await aiWebsiteQueue.add('generate', job, { removeOnComplete: 50 });
}
