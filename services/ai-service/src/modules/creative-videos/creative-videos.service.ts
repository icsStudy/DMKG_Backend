import { AiVideoStatus, prisma } from '@spacode/db';
import { Errors } from '@spacode/utils';
import { enqueueAiVideo } from '../../lib/queue.js';

export async function startVideoGeneration(
  businessId: string,
  data: {
    prompt: string;
    provider?: 'fal' | 'replicate_kling' | 'runway_gen4' | 'google_veo';
    aspectRatio?: '16:9' | '9:16' | '1:1';
    contentItemId?: string;
  },
) {
  if (!data.prompt?.trim()) throw Errors.validation('prompt is required');
  const provider = data.provider ?? 'fal';

  const job = await prisma.aiVideoJob.create({
    data: {
      businessId,
      provider,
      prompt: data.prompt,
      status: AiVideoStatus.QUEUED,
      options: { aspectRatio: data.aspectRatio, contentItemId: data.contentItemId },
    },
  });

  await enqueueAiVideo({
    jobId: job.id,
    provider,
    prompt: data.prompt,
    aspectRatio: data.aspectRatio,
  });

  return { id: job.id, status: job.status };
}

export async function getVideoJob(businessId: string, jobId: string) {
  const job = await prisma.aiVideoJob.findFirst({ where: { id: jobId, businessId } });
  if (!job) throw Errors.notFound('Video job not found');
  return job;
}
