import { getConfig } from '../config.js';

export async function callLlmJson(prompt: string): Promise<Record<string, unknown> | null> {
  const apiKey = getConfig().GEMINI_API_KEY;
  if (apiKey) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    );
    if (res.ok) {
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return JSON.parse(text) as Record<string, unknown>;
    }
  }

  const anthropicKey = getConfig().ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as { content?: { text?: string }[] };
      const text = json.content?.[0]?.text;
      if (text) return JSON.parse(text) as Record<string, unknown>;
    }
  }

  return null;
}
