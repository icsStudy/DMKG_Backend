import type { Job } from 'bullmq';
import { prisma, AiVideoStatus } from '@spacode/db';
import type { VideoGenerateJobPayload } from '@spacode/types';
import { logger } from '@spacode/utils';

export async function processVideoJob(job: Job<VideoGenerateJobPayload>): Promise<void> {
  const { jobId, provider, prompt, trim } = job.data;

  await prisma.aiVideoJob.update({
    where: { id: jobId },
    data: { status: AiVideoStatus.GENERATING, provider },
  });

  try {
    if (process.env.FAL_API_KEY || process.env.REPLICATE_API_TOKEN) {
      logger.info({ provider, prompt: prompt.slice(0, 80) }, 'Would call video provider');
    }
    if (trim) logger.info({ trim }, 'Would trim with ffmpeg');

    await prisma.aiVideoJob.update({
      where: { id: jobId },
      data: {
        status: AiVideoStatus.READY,
        mediaUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Video generation failed';
    await prisma.aiVideoJob.update({
      where: { id: jobId },
      data: { status: AiVideoStatus.FAILED, error: message },
    });
    throw err;
  }
}
