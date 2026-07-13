import { randomBytes } from 'crypto';

export interface GeneratedContentItem {
  idea: string;
  hook: string;
  description: string;
  cta: string;
  platform: string;
  scheduledAt: string;
}

interface BusinessContext {
  name: string;
  type?: string | null;
  description?: string | null;
  targetAudience?: string | null;
  marketingGoal?: string | null;
  platforms?: string[];
  strategy?: string;
}

function postsPerHorizon(horizonDays: 30 | 90): number {
  return horizonDays === 30 ? 12 : 36;
}

function distributeDates(horizonDays: 30 | 90, count: number): Date[] {
  const start = new Date();
  start.setHours(10, 0, 0, 0);
  const dates: Date[] = [];
  const stepMs = Math.floor((horizonDays * 86400000) / count);
  for (let i = 0; i < count; i += 1) {
    dates.push(new Date(start.getTime() + stepMs * i));
  }
  return dates;
}

function fallbackItems(ctx: BusinessContext, horizonDays: 30 | 90): GeneratedContentItem[] {
  const count = postsPerHorizon(horizonDays);
  const platforms = ctx.platforms?.length ? ctx.platforms : ['meta', 'instagram'];
  const dates = distributeDates(horizonDays, count);
  return dates.map((date, i) => {
    const platform = platforms[i % platforms.length] ?? 'meta';
    return {
      idea: `רעיון ${i + 1} ל${ctx.name}`,
      hook: `גלו את ${ctx.name} — ${ctx.marketingGoal ?? 'צמיחה דיגיטלית'}`,
      description: `${ctx.description ?? ctx.name} — תוכן שיווקי מותאם לקהל ${ctx.targetAudience ?? 'כללי'}.`,
      cta: 'השאירו פרטים לייעוץ חינם',
      platform,
      scheduledAt: date.toISOString(),
    };
  });
}

async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? '';
  if (!apiKey) return null;
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
  if (!res.ok) return null;
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

export async function generateContentPlan(
  ctx: BusinessContext,
  horizonDays: 30 | 90,
  strategy?: string,
): Promise<{ strategy: string; items: GeneratedContentItem[] }> {
  const count = postsPerHorizon(horizonDays);
  const prompt = `Generate a Hebrew marketing content plan as JSON for business "${ctx.name}".
Return exactly ${count} items spread over ${horizonDays} days.
JSON format: {"strategy":"...","items":[{"idea":"","hook":"","description":"","cta":"","platform":"meta","scheduledAt":"ISO8601"}]}`;

  const raw = await callGemini(prompt);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { strategy?: string; items?: GeneratedContentItem[] };
      if (parsed.items?.length) {
        return {
          strategy: parsed.strategy ?? strategy ?? `תוכנית שיווק ${horizonDays} יום`,
          items: parsed.items,
        };
      }
    } catch {
      /* fallback */
    }
  }

  return {
    strategy: strategy ?? `תוכנית שיווק ${horizonDays} יום ל${ctx.name}`,
    items: fallbackItems(ctx, horizonDays),
  };
}

export function createTrackingSlug(): string {
  return randomBytes(6).toString('hex');
}
