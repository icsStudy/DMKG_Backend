import { prisma } from '@spacode/db';
import { Errors } from '@spacode/utils';
import { decrypt } from '@spacode/utils';
import { enqueueBulkEmail, enqueueEmail } from '../../lib/queue.js';

export async function sendEmail(opts: {
  businessId: string;
  leadId?: string;
  to: string;
  subject: string;
  bodyHtml: string;
}) {
  await enqueueEmail({
    to: opts.to,
    subject: opts.subject,
    html: opts.bodyHtml,
    leadId: opts.leadId,
  });

  return { queued: true, to: opts.to, subject: opts.subject };
}

export async function sendBulk(
  _businessId: string,
  leadIds: string[],
  subject: string,
  bodyHtml: string,
) {
  await enqueueBulkEmail({
    templateId: 'inline',
    leadIds,
    variables: { subject, body: bodyHtml },
  });
  return { queued: leadIds.length };
}

export async function trackEvent(
  _businessId: string,
  data: { leadId?: string; type: string; subject?: string },
) {
  if (!data.leadId) return null;
  return prisma.emailEvent.create({
    data: {
      leadId: data.leadId,
      messageId: `track-${Date.now()}`,
      type: data.type,
      metadata: { subject: data.subject },
    },
  });
}

export async function listTemplates(businessId: string) {
  return prisma.emailTemplate.findMany({
    where: { OR: [{ businessId }, { businessId: null }] },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function createTemplate(
  businessId: string,
  data: { name: string; subject: string; bodyHtml: string },
) {
  return prisma.emailTemplate.create({
    data: {
      businessId,
      name: data.name,
      subject: data.subject,
      htmlBody: data.bodyHtml,
    },
  });
}

export async function updateTemplate(
  businessId: string,
  templateId: string,
  data: Partial<{ name: string; subject: string; bodyHtml: string }>,
) {
  const t = await prisma.emailTemplate.findFirst({
    where: { id: templateId, businessId },
  });
  if (!t) throw Errors.notFound('Template not found');
  return prisma.emailTemplate.update({
    where: { id: templateId },
    data: {
      name: data.name,
      subject: data.subject,
      htmlBody: data.bodyHtml,
    },
  });
}

export async function resolveLeadEmail(leadId: string): Promise<string | null> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead?.contactEmail) return null;
  try {
    return decrypt(lead.contactEmail);
  } catch {
    return lead.contactEmail;
  }
}
