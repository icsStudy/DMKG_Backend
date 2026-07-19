import { getConfig } from '../config.js';

export async function generateImage(prompt: string): Promise<string> {
  const apiKey = getConfig().GEMINI_API_KEY;
  if (!apiKey) {
    return `https://placehold.co/1080x1080/png?text=${encodeURIComponent(prompt.slice(0, 40))}`;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '1:1' },
      }),
    },
  );

  if (!res.ok) {
    return `https://placehold.co/1080x1080/png?text=${encodeURIComponent('AI Image')}`;
  }

  const json = (await res.json()) as {
    predictions?: { bytesBase64Encoded?: string; mimeType?: string }[];
  };
  const b64 = json.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) {
    return `https://placehold.co/1080x1080/png?text=${encodeURIComponent('AI Image')}`;
  }
  const mime = json.predictions?.[0]?.mimeType ?? 'image/png';
  return `data:${mime};base64,${b64}`;
}
