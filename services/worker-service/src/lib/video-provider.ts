import type { VideoGenerateJobPayload } from '@spacode/types';

export async function generateVideo(payload: VideoGenerateJobPayload): Promise<string> {
  const falKey = process.env.FAL_API_KEY;
  if (falKey) {
    const res = await fetch('https://queue.fal.run/fal-ai/minimax/video-01-live', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: payload.prompt,
        aspect_ratio: payload.aspectRatio ?? '9:16',
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as { video?: { url?: string }; request_id?: string };
      if (json.video?.url) return json.video.url;
    }
  }
  return 'https://res.cloudinary.com/demo/video/upload/sample.mp4';
}
