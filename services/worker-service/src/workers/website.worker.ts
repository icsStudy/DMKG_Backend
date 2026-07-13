import type { Job } from 'bullmq';
import { prisma, AiWebsiteStatus } from '@spacode/db';
import type { WebsiteGenerateJobPayload } from '@spacode/types';
import { logger } from '@spacode/utils';

function buildContactFormHtml(businessId: string, contentItemId?: string, trackingSlug?: string) {
  const apiUrl = process.env.PUBLIC_API_URL ?? 'http://localhost:3000';
  const utm = trackingSlug
    ? `<input type="hidden" name="utm_content" value="${trackingSlug}" />`
    : '';
  const itemField = contentItemId
    ? `<input type="hidden" name="contentItemId" value="${contentItemId}" />`
    : '';
  return `
<form action="${apiUrl}/api/contact" method="POST" dir="rtl" style="max-width:420px;margin:2rem auto;font-family:sans-serif">
  <input type="hidden" name="businessId" value="${businessId}" />
  ${itemField}
  ${utm}
  <label>שם<input name="name" required style="width:100%;padding:8px;margin:4px 0" /></label>
  <label>אימייל<input name="email" type="email" required style="width:100%;padding:8px;margin:4px 0" /></label>
  <label>טלפון<input name="phone" style="width:100%;padding:8px;margin:4px 0" /></label>
  <label>הודעה<textarea name="message" style="width:100%;padding:8px;margin:4px 0"></textarea></label>
  <button type="submit" style="padding:10px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px">שליחה</button>
</form>`;
}

export async function processWebsiteJob(job: Job<WebsiteGenerateJobPayload>): Promise<void> {
  const { jobId, businessId, customPrompt, prompt, slug, mode, language } = job.data;

  await prisma.aiWebsiteJob.update({
    where: { id: jobId },
    data: { status: AiWebsiteStatus.GENERATING, mode, language },
  });

  try {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const contentItem = await prisma.contentItem.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    const taskPrompt =
      customPrompt ?? prompt ?? `Build a marketing website for ${business?.name ?? 'business'}`;

    if (process.env.MANUS_API_KEY) {
      logger.info({ businessId }, 'Would create Manus website task');
    }

    const publicSlug = slug ?? `site-${jobId.slice(-8)}`;
    const formHtml = buildContactFormHtml(
      businessId,
      contentItem?.id,
      contentItem?.trackingSlug ?? undefined,
    );
    const html = `<!DOCTYPE html><html lang="${language ?? 'he'}" dir="rtl"><head><meta charset="utf-8"><title>${business?.name ?? 'Site'}</title></head><body><main style="max-width:720px;margin:0 auto;padding:2rem"><h1>${business?.name ?? 'Welcome'}</h1><p>${business?.description ?? taskPrompt}</p>${formHtml}</main></body></html>`;

    await prisma.aiWebsiteJob.update({
      where: { id: jobId },
      data: {
        manusTaskId: `manus-${Date.now()}`,
        status: AiWebsiteStatus.READY,
        resultHtml: html,
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
