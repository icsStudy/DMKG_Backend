import { randomBytes } from 'crypto';
import { getConfig } from '../config.js';

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
  const apiKey = getConfig().GEMINI_API_KEY;
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

async function callAnthropic(prompt: string): Promise<string | null> {
  const apiKey = getConfig().ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { content?: { text?: string }[] };
  return json.content?.[0]?.text ?? null;
}

function parseItems(raw: string, ctx: BusinessContext, horizonDays: 30 | 90): GeneratedContentItem[] {
  try {
    const parsed = JSON.parse(raw) as { items?: GeneratedContentItem[] };
    if (Array.isArray(parsed.items) && parsed.items.length > 0) {
      return parsed.items.map((item, i) => ({
        ...item,
        scheduledAt: item.scheduledAt ?? distributeDates(horizonDays, parsed.items!.length)[i]?.toISOString(),
      }));
    }
  } catch {
    /* fallback below */
  }
  return fallbackItems(ctx, horizonDays);
}

export async function generateContentPlan(
  ctx: BusinessContext,
  horizonDays: 30 | 90,
  strategy?: string,
): Promise<{ strategy: string; items: GeneratedContentItem[] }> {
  const count = postsPerHorizon(horizonDays);
  const prompt = `Generate a Hebrew marketing content plan as JSON for business "${ctx.name}".
Context: type=${ctx.type}, audience=${ctx.targetAudience}, goal=${ctx.marketingGoal}, description=${ctx.description}.
Strategy hint: ${strategy ?? ctx.strategy ?? 'brand awareness and lead generation'}.
Platforms: ${(ctx.platforms ?? ['meta']).join(', ')}.
Return exactly ${count} items spread over ${horizonDays} days.
JSON format: {"strategy":"...","items":[{"idea":"","hook":"","description":"","cta":"","platform":"meta","scheduledAt":"ISO8601"}]}`;

  const gemini = await callGemini(prompt);
  if (gemini) {
    const parsed = JSON.parse(gemini) as { strategy?: string; items?: GeneratedContentItem[] };
    if (parsed.items?.length) {
      return {
        strategy: parsed.strategy ?? strategy ?? `תוכנית שיווק ${horizonDays} יום`,
        items: parseItems(gemini, ctx, horizonDays),
      };
    }
  }

  const anthropic = await callAnthropic(prompt);
  if (anthropic) {
    const parsed = JSON.parse(anthropic) as { strategy?: string; items?: GeneratedContentItem[] };
    if (parsed.items?.length) {
      return {
        strategy: parsed.strategy ?? strategy ?? `תוכנית שיווק ${horizonDays} יום`,
        items: parseItems(anthropic, ctx, horizonDays),
      };
    }
  }

  return {
    strategy: strategy ?? `תוכנית שיווק ${horizonDays} יום ל${ctx.name}`,
    items: fallbackItems(ctx, horizonDays),
  };
}

export async function generateSingleItem(
  ctx: BusinessContext,
  opts: { platform?: string; idea?: string; scheduledAt?: string },
): Promise<GeneratedContentItem> {
  const platform = opts.platform ?? ctx.platforms?.[0] ?? 'meta';
  const prompt = `Generate one Hebrew social post as JSON for "${ctx.name}" on ${platform}.
Optional idea: ${opts.idea ?? 'general promotion'}.
Format: {"idea":"","hook":"","description":"","cta":"","platform":"${platform}","scheduledAt":"${opts.scheduledAt ?? new Date().toISOString()}"}`;

  const raw = (await callGemini(prompt)) ?? (await callAnthropic(prompt));
  if (raw) {
    try {
      const item = JSON.parse(raw) as GeneratedContentItem;
      return { ...item, platform, scheduledAt: opts.scheduledAt ?? item.scheduledAt ?? new Date().toISOString() };
    } catch {
      /* fallback */
    }
  }

  return {
    idea: opts.idea ?? `פוסט חדש ל${ctx.name}`,
    hook: `גלו את ${ctx.name}`,
    description: ctx.description ?? `תוכן שיווקי ל${ctx.name}`,
    cta: 'צרו קשר',
    platform,
    scheduledAt: opts.scheduledAt ?? new Date().toISOString(),
  };
}

export function createTrackingSlug(): string {
  return randomBytes(6).toString('hex');
}
