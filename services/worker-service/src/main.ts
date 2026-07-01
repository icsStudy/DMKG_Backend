import { prisma } from '@spacode/db';
import { logger } from '@spacode/utils';
import { getConfig } from './config.js';
import { startCronJobs } from './cron.js';
import { closeRedis } from './lib/redis.js';
import { startAllWorkers, stopAllWorkers } from './queues.js';

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'worker-service shutting down');
  await stopAllWorkers();
  await closeRedis();
  await prisma.$disconnect();
  process.exit(0);
}

async function main(): Promise<void> {
  logger.info({ buildRef: getConfig().BUILD_REF }, 'worker-service starting');
  startAllWorkers();
  startCronJobs();
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
