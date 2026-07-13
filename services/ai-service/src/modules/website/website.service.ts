import { prisma } from '@spacode/db';
import { Errors } from '@spacode/utils';
import { getConfig } from '../../config.js';
import { enqueueAiWebsite } from '../../lib/queue.js';

export async function generateWebsite(
  businessId: string,
  body: { prompt?: string; contentItemId?: string; mode?: string; language?: string },
) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw Errors.notFound('Business not found');

  const slug = `site-${businessId.slice(-8)}-${Date.now().toString(36)}`;
  const job = await prisma.aiWebsiteJob.create({
    data: {
      businessId,
      status: 'queued',
      prompt: body.prompt ?? `Landing page for ${business.name}`,
      publicSlug: slug,
      previewUrl: `/p/${slug}`,
      mode: body.mode ?? 'fromBusiness',
      language: body.language ?? 'he',
    },
  });

  await enqueueAiWebsite({
    jobId: job.id,
    businessId,
    mode: (body.mode as 'fromBusiness' | 'hybrid' | 'custom') ?? 'fromBusiness',
    language: (body.language as 'he' | 'en' | 'dual') ?? 'he',
    customPrompt: body.prompt,
    slug,
    prompt: body.prompt,
  });

  return { jobId: job.id, previewUrl: job.previewUrl, slug };
}

export async function setDomain(businessId: string, domain: string) {
  const job = await prisma.aiWebsiteJob.findFirst({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
  });
  if (!job) throw Errors.notFound('No website job found');
  const updated = await prisma.aiWebsiteJob.update({
    where: { id: job.id },
    data: { customDomain: domain },
  });
  return { domain: updated.customDomain };
}

export async function servePublicPage(slug: string) {
  const job = await prisma.aiWebsiteJob.findFirst({
    where: { publicSlug: slug, status: 'ready' },
  });
  if (!job?.resultHtml) throw Errors.notFound('Page not found');
  return job.resultHtml;
}

export function buildContactFormHtml(businessId: string, contentItemId?: string, trackingSlug?: string) {
  const apiUrl = getConfig().PUBLIC_API_URL;
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
