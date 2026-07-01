import type { Job } from 'bullmq';
import { prisma } from '@spacode/db';
import type { BulkEmailJobPayload } from '@spacode/types';
import { decrypt } from '@spacode/utils';
import { sendMail } from '../lib/mailer.js';

export async function processBulkEmailJob(job: Job<BulkEmailJobPayload>): Promise<void> {
  const { templateId, leadIds, variables } = job.data;

  let subject = variables?.subject ?? 'Message';
  let html = variables?.body ?? variables?.bodyHtml ?? '';

  if (templateId !== 'inline') {
    const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error(`Template ${templateId} not found`);
    subject = template.subject;
    html = template.htmlBody;
  }

  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds }, deletedAt: null },
  });

  for (const lead of leads) {
    let emailSubject = subject;
    let emailHtml = html;
    if (variables) {
      for (const [key, val] of Object.entries(variables)) {
        emailSubject = emailSubject.replaceAll(`{{${key}}}`, val);
        emailHtml = emailHtml.replaceAll(`{{${key}}}`, val);
      }
    }

    if (!lead.contactEmail) continue;
    let email: string;
    try {
      email = decrypt(lead.contactEmail);
    } catch {
      email = lead.contactEmail;
    }

    const { messageId } = await sendMail({ to: email, subject: emailSubject, html: emailHtml });
    await prisma.emailEvent.create({
      data: { leadId: lead.id, messageId, type: 'sent', metadata: { templateId, bulkJobId: job.id } },
    });
  }
}
