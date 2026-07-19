import { prisma } from '@spacode/db';
import { Errors } from '@spacode/utils';
import { callLlmJson } from '../../lib/llm-json.js';

export async function scoreContentItem(businessId: string, contentItemId: string) {
  const item = await prisma.contentItem.findFirst({
    where: { id: contentItemId, businessId },
  });
  if (!item) throw Errors.notFound('Content item not found');

  const prompt = `Score this marketing creative 1-100 for ${item.platform ?? 'social'}.
Hook: ${item.hook}
Description: ${item.description}
CTA: ${item.cta}
Return JSON: {"score":number,"breakdown":{"cta":number,"clarity":number,"engagement":number,"platformFit":number},"summary":"hebrew text"}`;

  const result =
    (await callLlmJson(prompt)) ?? {
      score: 72,
      breakdown: { cta: 70, clarity: 75, engagement: 72, platformFit: 71 },
      summary: 'ציון בסיסי — אין מפתח AI מוגדר',
    };

  const score = Number(result.score ?? 72);
  const breakdown = (result.breakdown as object) ?? result;

  return prisma.creativeScore.create({
    data: { businessId, contentItemId, score, breakdown },
  });
}

export async function getLatestScore(businessId: string, contentItemId: string) {
  return prisma.creativeScore.findFirst({
    where: { businessId, contentItemId },
    orderBy: { createdAt: 'desc' },
  });
}
