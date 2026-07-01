import type { Job } from 'bullmq';
import { prisma, AiWebsiteStatus } from '@spacode/db';
import type { WebsiteGenerateJobPayload } from '@spacode/types';
import { logger } from '@spacode/utils';

export async function processWebsiteJob(job: Job<WebsiteGenerateJobPayload>): Promise<void> {
  const { jobId, businessId, customPrompt, prompt, slug, mode, language } = job.data;

  await prisma.aiWebsiteJob.update({
    where: { id: jobId },
    data: { status: AiWebsiteStatus.GENERATING, mode, language },
  });

  try {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const taskPrompt =
      customPrompt ?? prompt ?? `Build a marketing website for ${business?.name ?? 'business'}`;

    if (process.env.MANUS_API_KEY) {
      logger.info({ businessId }, 'Would create Manus website task');
    }

    const publicSlug = slug ?? `site-${jobId.slice(-8)}`;
    const stubHtml = `<!DOCTYPE html><html lang="${language ?? 'he'}"><head><meta charset="utf-8"><title>${business?.name ?? 'Site'}</title></head><body><h1>${business?.name ?? 'Welcome'}</h1></body></html>`;

    await prisma.aiWebsiteJob.update({
      where: { id: jobId },
      data: {
        manusTaskId: `manus-${Date.now()}`,
        status: AiWebsiteStatus.READY,
        resultHtml: stubHtml,
        publicSlug,
        previewUrl: `/p/${publicSlug}`,
        prompt: taskPrompt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Website generation failed';
    await prisma.aiWebsiteJob.update({
      where: { id: jobId },
      data: { status: AiWebsiteStatus.FAILED, error: message },
    });
    throw err;
  }
}
