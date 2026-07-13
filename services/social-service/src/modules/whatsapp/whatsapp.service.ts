import { WhatsAppTemplateStatus, prisma } from '@spacode/db';
import type {
  CreateWhatsAppTemplateDto,
  SendWhatsAppMessageDto,
  WhatsAppTemplateDto,
} from '@spacode/types';
import { decrypt, Errors } from '@spacode/utils';
import { graphGet, graphPost } from '../../lib/meta-client.js';

function toDto(t: {
  id: string;
  businessId: string;
  metaTemplateId: string | null;
  name: string;
  language: string;
  category: string;
  status: string;
  components: unknown;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): WhatsAppTemplateDto {
  return {
    id: t.id,
    businessId: t.businessId,
    metaTemplateId: t.metaTemplateId,
    name: t.name,
    language: t.language,
    category: t.category,
    status: t.status,
    components: t.components,
    rejectionReason: t.rejectionReason,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

async function getWhatsAppConnection(businessId: string) {
  const conn = await prisma.socialConnection.findUnique({
    where: { businessId_platform: { businessId, platform: 'whatsapp' } },
  });
  if (!conn) throw Errors.notFound('WhatsApp not connected');
  return conn;
}

export async function listTemplates(businessId: string): Promise<WhatsAppTemplateDto[]> {
  await syncTemplates(businessId);
  const templates = await prisma.whatsAppTemplate.findMany({
    where: { businessId },
    orderBy: { updatedAt: 'desc' },
  });
  return templates.map(toDto);
}

export async function syncTemplates(businessId: string): Promise<number> {
  const conn = await getWhatsAppConnection(businessId);
  const meta = conn.metadata as { wabaId?: string } | null;
  const wabaId = meta?.wabaId;
  if (!wabaId) return 0;

  const token = decrypt(conn.accessToken);
  const remote = await graphGet<{
    data: {
      id: string;
      name: string;
      language: string;
      status: string;
      category: string;
      components: unknown;
      rejected_reason?: string;
    }[];
  }>(`/${wabaId}/message_templates`, token);

  let count = 0;
  for (const tpl of remote.data ?? []) {
    await prisma.whatsAppTemplate.upsert({
      where: {
        businessId_name_language: {
          businessId,
          name: tpl.name,
          language: tpl.language,
        },
      },
      create: {
        businessId,
        metaTemplateId: tpl.id,
        name: tpl.name,
        language: tpl.language,
        category: tpl.category,
        status: tpl.status,
        components: tpl.components as object,
        rejectionReason: tpl.rejected_reason,
      },
      update: {
        metaTemplateId: tpl.id,
        status: tpl.status,
        components: tpl.components as object,
        rejectionReason: tpl.rejected_reason,
      },
    });
    count += 1;
  }
  return count;
}

export async function submitTemplate(
  businessId: string,
  data: CreateWhatsAppTemplateDto,
): Promise<WhatsAppTemplateDto> {
  const conn = await getWhatsAppConnection(businessId);
  const meta = conn.metadata as { wabaId?: string } | null;
  const wabaId = meta?.wabaId;
  if (!wabaId) throw Errors.validation('WABA not configured');

  const token = decrypt(conn.accessToken);
  const components: object[] = [];
  if (data.header) {
    components.push({ type: 'HEADER', format: 'TEXT', text: data.header });
  }
  components.push({ type: 'BODY', text: data.body });
  if (data.footer) {
    components.push({ type: 'FOOTER', text: data.footer });
  }

  const result = await graphPost<{ id: string; status: string }>(
    `/${wabaId}/message_templates`,
    token,
    {
      name: data.name,
      language: data.language ?? 'he',
      category: data.category ?? 'MARKETING',
      components,
    },
  );

  const template = await prisma.whatsAppTemplate.create({
    data: {
      businessId,
      metaTemplateId: result.id,
      name: data.name,
      language: data.language ?? 'he',
      category: data.category ?? 'MARKETING',
      status: result.status ?? WhatsAppTemplateStatus.PENDING,
      components,
    },
  });
  return toDto(template);
}

export async function getTemplateStatus(businessId: string, templateId: string) {
  await syncTemplates(businessId);
  const template = await prisma.whatsAppTemplate.findFirst({
    where: { id: templateId, businessId },
  });
  if (!template) throw Errors.notFound('Template not found');
  return toDto(template);
}

export async function sendTemplateMessage(businessId: string, data: SendWhatsAppMessageDto) {
  const conn = await getWhatsAppConnection(businessId);
  const meta = conn.metadata as { phoneNumberId?: string } | null;
  const phoneNumberId = meta?.phoneNumberId ?? conn.accountId;
  if (!phoneNumberId) throw Errors.validation('WhatsApp phone number not configured');

  const template = await prisma.whatsAppTemplate.findFirst({
    where: { id: data.templateId, businessId, status: WhatsAppTemplateStatus.APPROVED },
  });
  if (!template) throw Errors.validation('Template must be APPROVED');

  const token = decrypt(conn.accessToken);
  const components =
    data.variables?.length ?
      [{ type: 'body', parameters: data.variables.map((v) => ({ type: 'text', text: v })) }]
    : undefined;

  const result = await graphPost<{ messages: { id: string }[] }>(
    `/${phoneNumberId}/messages`,
    token,
    {
      messaging_product: 'whatsapp',
      to: data.to.replace(/\D/g, ''),
      type: 'template',
      template: {
        name: template.name,
        language: { code: template.language },
        ...(components && { components }),
      },
    },
  );

  if (data.contentItemId) {
    await prisma.contentItem.update({
      where: { id: data.contentItemId },
      data: { whatsappTemplateId: template.id },
    });
  }

  return { messageId: result.messages?.[0]?.id };
}
