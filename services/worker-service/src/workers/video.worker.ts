import type { Job } from 'bullmq';
import { prisma, AiVideoStatus } from '@spacode/db';
import type { VideoGenerateJobPayload } from '@spacode/types';
import { logger } from '@spacode/utils';
import { generateVideo } from '../lib/video-provider.js';

export async function processVideoJob(job: Job<VideoGenerateJobPayload>): Promise<void> {
  const { jobId, provider, trim } = job.data;

  await prisma.aiVideoJob.update({
    where: { id: jobId },
    data: { status: AiVideoStatus.GENERATING, provider },
  });

  try {
    const mediaUrl = await generateVideo(job.data);
    if (trim) logger.info({ trim }, 'Video trim not applied in v1');

    await prisma.aiVideoJob.update({
      where: { id: jobId },
      data: { status: AiVideoStatus.READY, mediaUrl },
    });

    const record = await prisma.aiVideoJob.findUnique({ where: { id: jobId } });
    const contentItemId = (record?.options as { contentItemId?: string } | null)?.contentItemId;
    if (contentItemId && mediaUrl) {
      await prisma.contentItem.update({
        where: { id: contentItemId },
        data: { mediaUrl },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Video generation failed';
    await prisma.aiVideoJob.update({
      where: { id: jobId },
      data: { status: AiVideoStatus.FAILED, error: message },
    });
    throw err;
  }
}
