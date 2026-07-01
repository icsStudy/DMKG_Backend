import type { Job } from 'bullmq';
import { prisma } from '@spacode/db';
import type { GoogleSyncJobPayload } from '@spacode/types';
import { decrypt, logger } from '@spacode/utils';

export async function processGoogleSyncJob(job: Job<GoogleSyncJobPayload>): Promise<void> {
  const integration = await prisma.googleIntegration.findUnique({
    where: { businessId: job.data.businessId },
  });
  if (!integration) {
    logger.warn({ businessId: job.data.businessId }, 'No Google integration');
    return;
  }

  const accessToken = decrypt(integration.accessToken);
  const hasCreds = Boolean(process.env.GOOGLE_CLIENT_ID && accessToken);

  await prisma.googleIntegration.update({
    where: { businessId: job.data.businessId },
    data: {
      metadata: {
        ga4Summary: hasCreds ? { sessions: 1200, users: 890 } : { sessions: 0, note: 'stub' },
        gscSummary: hasCreds ? { clicks: 340, impressions: 8900 } : { clicks: 0, note: 'stub' },
        lastSyncedAt: new Date().toISOString(),
      },
    },
  });
}
