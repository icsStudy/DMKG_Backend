import { prisma, SocialPlatform } from '@spacode/db';
import type { SocialConnectionDto } from '@spacode/types';
import { decrypt, encrypt, Errors } from '@spacode/utils';
import { getConfig } from '../../config.js';
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getOAuthUrl,
  graphGet,
} from '../../lib/meta-client.js';

const META_SCOPES = [
  'pages_manage_posts',
  'pages_read_engagement',
  'pages_show_list',
  'ads_management',
  'leads_retrieval',
  'whatsapp_business_management',
  'whatsapp_business_messaging',
  'business_management',
];

export async function listConnections(businessId: string): Promise<SocialConnectionDto[]> {
  const connections = await prisma.socialConnection.findMany({ where: { businessId } });
  return connections.map((c) => ({
    platform: c.platform,
    accountId: c.accountId,
    accountName: c.accountName,
    connected: true,
    metadata: c.metadata as Record<string, unknown> | null,
  }));
}

export function getMetaConnectUrl(businessId: string): string {
  const state = Buffer.from(JSON.stringify({ businessId, platform: 'meta' })).toString('base64url');
  return getOAuthUrl(state, META_SCOPES);
}

export function getWhatsAppConnectUrl(businessId: string): string {
  const state = Buffer.from(JSON.stringify({ businessId, platform: 'whatsapp' })).toString(
    'base64url',
  );
  return getOAuthUrl(state, META_SCOPES);
}

export async function handleMetaCallback(code: string, state: string): Promise<string> {
  const parsed = JSON.parse(Buffer.from(state, 'base64url').toString()) as {
    businessId: string;
    platform: string;
  };
  const short = await exchangeCodeForToken(code);
  const accessToken = await getLongLivedToken(short.access_token);

  const pages = await graphGet<{ data: { id: string; name: string; access_token: string }[] }>(
    '/me/accounts',
    accessToken,
  );
  const page = pages.data?.[0];
  if (!page) throw Errors.validation('No Facebook pages found for this account');

  const pageToken = page.access_token;
  const expiresAt = short.expires_in
    ? new Date(Date.now() + short.expires_in * 1000)
    : new Date(Date.now() + 60 * 86400000);

  await prisma.socialConnection.upsert({
    where: {
      businessId_platform: { businessId: parsed.businessId, platform: SocialPlatform.META },
    },
    create: {
      businessId: parsed.businessId,
      platform: SocialPlatform.META,
      accountId: page.id,
      accountName: page.name,
      accessToken: encrypt(pageToken),
      tokenExpiresAt: expiresAt,
      metadata: { pageId: page.id, userToken: encrypt(accessToken) },
    },
    update: {
      accountId: page.id,
      accountName: page.name,
      accessToken: encrypt(pageToken),
      tokenExpiresAt: expiresAt,
      metadata: { pageId: page.id, userToken: encrypt(accessToken) },
    },
  });

  return `${getConfig().PUBLIC_API_URL.replace(':3000', ':3060')}/integrations/?connected=meta`;
}

export async function handleWhatsAppCallback(code: string, state: string): Promise<string> {
  const parsed = JSON.parse(Buffer.from(state, 'base64url').toString()) as {
    businessId: string;
  };
  const short = await exchangeCodeForToken(code);
  const accessToken = await getLongLivedToken(short.access_token);

  const waba = await graphGet<{ data: { id: string; name: string }[] }>(
    '/me/businesses',
    accessToken,
  );
  const business = waba.data?.[0];

  let phoneNumberId: string | undefined;
  if (business) {
    const phones = await graphGet<{ data: { id: string; display_phone_number: string }[] }>(
      `/${business.id}/phone_numbers`,
      accessToken,
    ).catch(() => ({ data: [] }));
    phoneNumberId = phones.data?.[0]?.id;
  }

  await prisma.socialConnection.upsert({
    where: {
      businessId_platform: { businessId: parsed.businessId, platform: SocialPlatform.WHATSAPP },
    },
    create: {
      businessId: parsed.businessId,
      platform: SocialPlatform.WHATSAPP,
      accountId: phoneNumberId ?? business?.id,
      accountName: business?.name ?? 'WhatsApp Business',
      accessToken: encrypt(accessToken),
      metadata: {
        wabaId: business?.id,
        phoneNumberId,
      },
    },
    update: {
      accountId: phoneNumberId ?? business?.id,
      accountName: business?.name ?? 'WhatsApp Business',
      accessToken: encrypt(accessToken),
      metadata: {
        wabaId: business?.id,
        phoneNumberId,
      },
    },
  });

  return `${getConfig().PUBLIC_API_URL.replace(':3000', ':3060')}/integrations/?connected=whatsapp`;
}

export async function deleteConnection(businessId: string, platform: string): Promise<void> {
  await prisma.socialConnection.deleteMany({ where: { businessId, platform } });
}

export async function getConnectionToken(businessId: string, platform: string): Promise<string> {
  const conn = await prisma.socialConnection.findUnique({
    where: { businessId_platform: { businessId, platform } },
  });
  if (!conn) throw Errors.notFound(`No ${platform} connection`);
  return decrypt(conn.accessToken);
}

export async function getWhatsAppProfile(businessId: string) {
  const conn = await prisma.socialConnection.findUnique({
    where: { businessId_platform: { businessId, platform: SocialPlatform.WHATSAPP } },
  });
  if (!conn) throw Errors.notFound('WhatsApp not connected');
  return {
    accountName: conn.accountName,
    metadata: conn.metadata,
  };
}
