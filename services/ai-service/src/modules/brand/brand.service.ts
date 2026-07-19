import { prisma } from '@spacode/db';
import { Errors } from '@spacode/utils';
import { callLlmJson } from '../../lib/llm-json.js';

export async function importBrandFromUrl(businessId: string, url: string) {
  if (!url?.trim()) throw Errors.validation('url is required');

  let pageText = '';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SpacodeBot/1.0' } });
    if (res.ok) {
      const html = await res.text();
      pageText = html.replace(/<[^>]+>/g, ' ').slice(0, 10000);
    }
  } catch {
    throw Errors.validation('Could not fetch URL');
  }

  const prompt = `Extract brand profile from website text. URL: ${url}
Text: ${pageText.slice(0, 5000)}
Return JSON: {"name":"","description":"","tagline":"","logoUrl":"","colors":["#hex"],"fonts":[],"targetAudience":""}`;

  const extracted =
    (await callLlmJson(prompt)) ?? {
      name: '',
      description: pageText.slice(0, 200),
      tagline: '',
      logoUrl: '',
      colors: [],
      targetAudience: '',
    };

  const business = await prisma.business.update({
    where: { id: businessId },
    data: {
      website: url,
      ...(extracted.description ? { description: String(extracted.description) } : {}),
      ...(extracted.targetAudience ? { targetAudience: String(extracted.targetAudience) } : {}),
      ...(extracted.logoUrl ? { logoUrl: String(extracted.logoUrl) } : {}),
      ...(extracted.colors ? { brandColors: { colors: extracted.colors } } : {}),
      ...(extracted.name ? { name: String(extracted.name) } : {}),
    },
  });

  return { business, extracted };
}
