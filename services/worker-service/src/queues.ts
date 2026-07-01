import { Worker, type Job, type ConnectionOptions } from 'bullmq';
import { QUEUE_NAMES } from '@spacode/types';
import { logger } from '@spacode/utils';
import { getConfig } from './config.js';
import { processEmailJob } from './workers/email.worker.js';
import { processBulkEmailJob } from './workers/bulk-email.worker.js';
import { processLeadScoreJob } from './workers/lead-score.worker.js';
import { processSocialPublishJob } from './workers/social-publish.worker.js';
import { processVideoJob } from './workers/video.worker.js';
import { processWebsiteJob } from './workers/website.worker.js';
import { processGoogleSyncJob } from './workers/google-sync.worker.js';
import { processWebhookJob } from './workers/webhook-process.worker.js';

const workers: Worker[] = [];

function getConnection(): ConnectionOptions {
  return { url: getConfig().REDIS_URL, maxRetriesPerRequest: null } as ConnectionOptions;
}

function createWorker<T>(
  name: string,
  processor: (job: Job<T>) => Promise<void>,
  concurrency = 1,
): Worker {
  const worker = new Worker<T>(name, processor, {
    connection: getConnection(),
    concurrency,
  });
  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ queue: name, jobId: job?.id, err }, 'Job failed');
  });
  return worker;
}

export function startAllWorkers(): Worker[] {
  workers.push(
    createWorker(QUEUE_NAMES.EMAIL_SEND, processEmailJob, 5),
    createWorker(QUEUE_NAMES.BULK_EMAIL, processBulkEmailJob, 2),
    createWorker(QUEUE_NAMES.LEAD_SCORE, processLeadScoreJob, 10),
    createWorker(QUEUE_NAMES.SOCIAL_PUBLISH, processSocialPublishJob, 3),
    createWorker(QUEUE_NAMES.AI_VIDEO, processVideoJob, 2),
    createWorker(QUEUE_NAMES.AI_WEBSITE, processWebsiteJob, 2),
    createWorker(QUEUE_NAMES.GOOGLE_SYNC, processGoogleSyncJob, 2),
    createWorker(QUEUE_NAMES.WEBHOOK_PROCESS, processWebhookJob, 5),
  );
  logger.info({ count: workers.length }, 'BullMQ workers started');
  return workers;
}

export async function stopAllWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  workers.length = 0;
}
