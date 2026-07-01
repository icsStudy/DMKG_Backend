import type { Job } from 'bullmq';
import { prisma } from '@spacode/db';
import type { LeadScoreJobPayload } from '@spacode/types';
import { computeLeadScore } from '../lib/lead-scoring.js';

export async function processLeadScoreJob(job: Job<LeadScoreJobPayload>): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: job.data.leadId } });
  if (!lead || lead.deletedAt) return;

  await prisma.lead.update({
    where: { id: lead.id },
    data: { leadScore: computeLeadScore(lead) },
  });
}
