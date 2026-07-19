import type { VideoGenerateJobPayload } from '@spacode/types';
import { getConfig } from '../config.js';

export async function generateVideo(payload: VideoGenerateJobPayload): Promise<string> {
  const falKey = getConfig().FAL_API_KEY;
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
      if (json.request_id) {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const statusRes = await fetch(
            `https://queue.fal.run/fal-ai/minimax/video-01-live/requests/${json.request_id}/status`,
            { headers: { Authorization: `Key ${falKey}` } },
          );
          if (statusRes.ok) {
            const st = (await statusRes.json()) as { video?: { url?: string }; status?: string };
            if (st.video?.url) return st.video.url;
            if (st.status === 'FAILED') break;
          }
        }
      }
    }
  }

  return 'https://res.cloudinary.com/demo/video/upload/sample.mp4';
}
