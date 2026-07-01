import type { Job } from 'bullmq';
import { prisma } from '@spacode/db';
import type { EmailJobPayload } from '@spacode/types';
import { logger } from '@spacode/utils';
import { sendMail } from '../lib/mailer.js';

export async function processEmailJob(job: Job<EmailJobPayload>): Promise<void> {
  const { to, subject, html, text, leadId, messageId } = job.data;
  const { messageId: sentId } = await sendMail({ to, subject, html, text });

  if (leadId) {
    await prisma.emailEvent.create({
      data: {
        leadId,
        messageId: messageId ?? sentId,
        type: 'sent',
        metadata: { subject, jobId: job.id },
      },
    });
    await prisma.interaction.create({
      data: { leadId, type: 'email_sent', content: subject, metadata: { messageId: sentId } },
    });
  }
  logger.info({ leadId, messageId: sentId }, 'Email sent');
}
