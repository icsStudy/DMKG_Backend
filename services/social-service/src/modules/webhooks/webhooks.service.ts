import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@spacode/db';
import { LeadSource } from '@spacode/db';
import { Errors } from '@spacode/utils';
import { getConfig } from '../../config.js';
import { enqueueWebhookProcess } from '../../lib/queue.js';

export async function listWebhookLogs(businessId?: string) {
  return prisma.webhookLog.findMany({
    where: businessId ? { businessId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function retryWebhook(logId: string) {
  const log = await prisma.webhookLog.findUnique({ where: { id: logId } });
  if (!log) throw Errors.notFound('Webhook log not found');
  await prisma.webhookLog.update({
    where: { id: logId },
    data: { status: 'received', error: null, processedAt: null },
  });
  await enqueueWebhookProcess(logId);
  return { retried: true };
}

async function createWebhookLog(
  source: string,
  eventType: string,
  payload: object,
  businessId?: string,
  externalId?: string,
) {
  const log = await prisma.webhookLog.create({
    data: {
      businessId,
      source,
      eventType,
      payload,
      externalId,
      status: 'received',
    },
  });
  await enqueueWebhookProcess(log.id);
  return log;
}

export function verifyMetaChallenge(mode: string | undefined, token: string | undefined, challenge: string | undefined) {
  if (mode === 'subscribe' && token === getConfig().META_WEBHOOK_VERIFY_TOKEN) {
    return challenge ?? '';
  }
  throw Errors.unauthorized('Invalid verify token');
}

export function verifyWhatsAppChallenge(mode: string | undefined, token: string | undefined, challenge: string | undefined) {
  if (mode === 'subscribe' && token === getConfig().WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return challenge ?? '';
  }
  throw Errors.unauthorized('Invalid verify token');
}

export async function handleMetaLeadgen(body: Record<string, unknown>) {
  const entry = (body.entry as { id?: string; changes?: { field?: string; value?: Record<string, unknown> }[] }[])?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value as {
    leadgen_id?: string;
    form_id?: string;
    ad_id?: string;
    page_id?: string;
    field_data?: { name: string; values: string[] }[];
  };

  const leadgenId = value?.leadgen_id ?? `meta-${Date.now()}`;
  let businessId: string | undefined;
  if (value?.page_id) {
    const conn = await prisma.socialConnection.findFirst({
      where: { accountId: value.page_id, platform: 'meta' },
    });
    businessId = conn?.businessId;
  }

  let contentItemId: string | undefined;
  if (value?.ad_id) {
    const campaign = await prisma.metaAdCampaign.findFirst({
      where: { metaAdId: value.ad_id },
    });
    contentItemId = campaign?.contentItemId ?? undefined;
  }

  const fieldMap: Record<string, string> = {};
  for (const field of value?.field_data ?? []) {
    fieldMap[field.name] = field.values?.[0] ?? '';
  }

  await createWebhookLog(
    'meta_leadgen',
    'leadgen',
    {
      email: fieldMap.email ?? fieldMap.EMAIL,
      name: fieldMap.full_name ?? fieldMap.first_name,
      phone: fieldMap.phone_number ?? fieldMap.phone,
      message: fieldMap.message,
      source: LeadSource.FACEBOOK,
      contentItemId,
      metaAdId: value?.ad_id,
      formId: value?.form_id,
      utm_content: contentItemId,
    },
    businessId,
    leadgenId,
  );

  return { received: true };
}

export async function handleWhatsAppWebhook(body: Record<string, unknown>) {
  const entry = (body.entry as { changes?: { value?: { messages?: { from: string; text?: { body: string } }[] } }[] }[])?.[0];
  const message = entry?.changes?.[0]?.value?.messages?.[0];
  if (!message) return { received: true };

  await createWebhookLog('whatsapp', 'inbound_message', {
    phone: message.from,
    message: message.text?.body,
    source: 'whatsapp',
  });

  return { received: true };
}

export async function handleInboundWebhook(
  businessId: string,
  payload: Record<string, unknown>,
  signature?: string,
) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw Errors.notFound('Business not found');

  if (business.webhookSecret && signature) {
    const expected = createHmac('sha256', business.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    const sig = signature.replace(/^sha256=/, '');
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      throw Errors.unauthorized('Invalid webhook signature');
    }
  }

  const contentItemId =
    (payload.contentItemId as string) ??
    (payload.utm_content as string);

  await createWebhookLog(
    'inbound',
    'custom',
    {
      ...payload,
      businessId,
      contentItemId,
      source: LeadSource.WEBHOOK,
    },
    businessId,
  );

  return { received: true };
}

export function verifyTikTokChallenge(
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined,
) {
  if (mode === 'subscribe' && token === getConfig().TIKTOK_WEBHOOK_VERIFY_TOKEN) {
    return challenge ?? '';
  }
  throw Errors.unauthorized('Invalid verify token');
}

export async function handleTikTokLeadgen(body: Record<string, unknown>) {
  const leadId = (body.lead_id as string) ?? (body.leadgen_id as string) ?? `tiktok-${Date.now()}`;
  const businessId = body.business_id as string | undefined;

  await createWebhookLog(
    'tiktok_leadgen',
    'leadgen',
    {
      name: body.name ?? body.full_name,
      email: body.email,
      phone: body.phone ?? body.phone_number,
      message: body.message,
      source: LeadSource.TIKTOK,
    },
    businessId,
    leadId,
  );

  return { received: true };
}

export async function handleLinkedInLeadgen(body: Record<string, unknown>) {
  const leadId = (body.id as string) ?? `linkedin-${Date.now()}`;

  await createWebhookLog(
    'linkedin_leadgen',
    'leadgen',
    {
      name: body.firstName ? `${body.firstName} ${body.lastName ?? ''}`.trim() : body.name,
      email: body.email,
      phone: body.phone,
      source: LeadSource.LINKEDIN,
    },
    body.businessId as string | undefined,
    leadId,
  );

  return { received: true };
}

export async function handleMetaComment(body: Record<string, unknown>) {
  const entry = (body.entry as { id?: string; changes?: { value?: { item?: string; message?: string; from?: { name?: string } } }[] }[])?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  if (!value?.item || !value.message) return { received: true };

  let businessId: string | undefined;
  if (entry?.id) {
    const conn = await prisma.socialConnection.findFirst({
      where: { accountId: entry.id, platform: 'meta' },
    });
    businessId = conn?.businessId;
  }

  if (businessId) {
    await prisma.socialMessage.upsert({
      where: { externalId: value.item },
      create: {
        businessId,
        platform: 'meta',
        type: 'comment',
        externalId: value.item,
        fromName: value.from?.name,
        content: value.message,
      },
      update: { content: value.message },
    });
  }

  await createWebhookLog('meta_comment', 'comment', value as object, businessId, value.item);
  return { received: true };
}

export async function handleTemplateStatusUpdate(body: Record<string, unknown>) {
  const entry = (body.entry as { changes?: { value?: { message_template_name?: string; message_template_language?: string; event?: string; reason?: string } }[] }[])?.[0];
  const value = entry?.changes?.[0]?.value;
  if (!value?.message_template_name) return { received: true };

  const status =
    value.event === 'APPROVED' ? 'APPROVED' : value.event === 'REJECTED' ? 'REJECTED' : 'PENDING';

  await prisma.whatsAppTemplate.updateMany({
    where: { name: value.message_template_name, language: value.message_template_language ?? 'he' },
    data: { status, rejectionReason: value.reason ?? null },
  });

  return { received: true };
}
