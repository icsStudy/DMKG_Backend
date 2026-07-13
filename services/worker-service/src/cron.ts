import cron from 'node-cron';
import { prisma } from '@spacode/db';
import { logger } from '@spacode/utils';
import { sweepStalePublishes } from './workers/social-publish.worker.js';

export function startCronJobs(): void {
  cron.schedule('5 0 * * *', async () => {
    logger.info('Running daily metrics aggregation');
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(yesterday.getTime() + 86400000);

    const businesses = await prisma.business.findMany({
      where: { deletedAt: null },
      select: { id: true },
      take: 500,
    });

    for (const { id: businessId } of businesses) {
      const [leadsCreated, leadsConverted, emailsSent] = await Promise.all([
        prisma.lead.count({
          where: { businessId, createdAt: { gte: yesterday, lt: dayEnd } },
        }),
        prisma.lead.count({
          where: { businessId, status: 'converted', updatedAt: { gte: yesterday } },
        }),
        prisma.emailEvent.count({
          where: { type: 'sent', timestamp: { gte: yesterday }, lead: { businessId } },
        }),
      ]);

      await prisma.dailyMetrics.upsert({
        where: { businessId_date: { businessId, date: yesterday } },
        create: { businessId, date: yesterday, leadsCreated, leadsConverted, emailsSent },
        update: { leadsCreated, leadsConverted, emailsSent },
      });
    }
  });

  cron.schedule('*/5 * * * *', async () => {
    const count = await sweepStalePublishes();
    if (count > 0) logger.warn({ count }, 'Marked stale publishes as failed');
  });

  cron.schedule('* * * * *', async () => {
    const { enqueueDueScheduledPosts } = await import('./workers/social-publish.worker.js');
    const count = await enqueueDueScheduledPosts();
    if (count > 0) logger.info({ count }, 'Enqueued scheduled social posts');
  });

  cron.schedule('0 */6 * * *', async () => {
    const count = await prisma.googleIntegration.count();
    logger.info({ count }, 'Google sync cron tick');
  });

  logger.info('Cron jobs scheduled');
}
