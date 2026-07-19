import { prisma, Prisma } from '@spacode/db';
import { Errors } from '@spacode/utils';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || `bio-${Date.now()}`;
}

export async function getBioLink(businessId: string) {
  return prisma.bioLink.findUnique({ where: { businessId } });
}

export async function upsertBioLink(
  businessId: string,
  data: { slug?: string; blocks: unknown[]; theme?: object; published?: boolean },
) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw Errors.notFound('Business not found');

  const slug = data.slug ?? slugify(business.name);

  return prisma.bioLink.upsert({
    where: { businessId },
    create: {
      businessId,
      slug,
      blocks: data.blocks as Prisma.InputJsonValue,
      theme: (data.theme ?? undefined) as Prisma.InputJsonValue | undefined,
      published: data.published ?? false,
    },
    update: {
      slug: data.slug ?? undefined,
      blocks: data.blocks as Prisma.InputJsonValue,
      theme: (data.theme ?? undefined) as Prisma.InputJsonValue | undefined,
      published: data.published,
    },
  });
}

export async function getPublicBioHtml(slug: string): Promise<string | null> {
  const bio = await prisma.bioLink.findUnique({
    where: { slug },
    include: { business: { select: { name: true, logoUrl: true } } },
  });
  if (!bio?.published) return null;

  const blocks = bio.blocks as { type: string; label: string; url: string }[];
  const theme = (bio.theme as { bg?: string; text?: string }) ?? {};
  const bg = theme.bg ?? '#0f172a';
  const text = theme.text ?? '#f8fafc';

  const links = blocks
    .map(
      (b) =>
        `<a href="${b.url}" style="display:block;margin:12px 0;padding:14px 20px;background:#1e293b;color:${text};text-decoration:none;border-radius:12px;text-align:center">${b.label}</a>`,
    )
    .join('');

  return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${bio.business.name}</title></head><body style="margin:0;font-family:system-ui;background:${bg};color:${text};min-height:100vh;display:flex;align-items:center;justify-content:center"><div style="max-width:420px;width:100%;padding:24px;text-align:center">${bio.business.logoUrl ? `<img src="${bio.business.logoUrl}" alt="" style="width:80px;height:80px;border-radius:50%;margin-bottom:16px"/>` : ''}<h1 style="font-size:1.5rem;margin:0 0 24px">${bio.business.name}</h1>${links}</div></body></html>`;
}
