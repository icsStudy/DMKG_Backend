import { prisma, Prisma } from '@spacode/db';
import { Errors } from '@spacode/utils';
import { callLlmJson } from '../../lib/llm-json.js';

export async function analyzeCompetitor(
  businessId: string,
  data: { competitorUrl: string; platform?: string },
) {
  if (!data.competitorUrl?.trim()) throw Errors.validation('competitorUrl is required');

  let pageText = '';
  try {
    const res = await fetch(data.competitorUrl, {
      headers: { 'User-Agent': 'SpacodeBot/1.0' },
    });
    if (res.ok) {
      const html = await res.text();
      pageText = html.replace(/<[^>]+>/g, ' ').slice(0, 8000);
    }
  } catch {
    pageText = data.competitorUrl;
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const prompt = `Analyze competitor page for business "${business?.name}".
URL: ${data.competitorUrl}
Page text excerpt: ${pageText.slice(0, 4000)}
Return JSON: {"themes":[],"visualStyle":"","messaging":"","gaps":[],"recommendations":[],"summary":"hebrew"}`;

  const analysis =
    (await callLlmJson(prompt)) ?? {
      themes: ['מיתוג', 'מבצעים'],
      visualStyle: 'לא זמין',
      messaging: 'לא זמין',
      gaps: [],
      recommendations: ['הגדירו מפתח AI לניתוח מעמיק'],
      summary: 'ניתוח בסיסי',
    };

  return prisma.competitorInsight.create({
    data: {
      businessId,
      competitorUrl: data.competitorUrl,
      platform: data.platform,
      analysis: analysis as Prisma.InputJsonValue,
    },
  });
}

export async function listCompetitorInsights(businessId: string) {
  return prisma.competitorInsight.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
