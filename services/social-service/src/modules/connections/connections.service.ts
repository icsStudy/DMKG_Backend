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
import {
  exchangeTikTokCode,
  getTikTokOAuthUrl,
  getTikTokUserInfo,
} from '../../lib/tiktok-client.js';
import {
  exchangeLinkedInCode,
  getLinkedInOAuthUrl,
  getLinkedInOrganizations,
} from '../../lib/linkedin-client.js';
import {
  exchangeTwitterCode,
  generatePkce,
  getTwitterOAuthUrl,
  getTwitterUser,
} from '../../lib/twitter-client.js';
import {
  exchangeYouTubeCode,
  getYouTubeChannel,
  getYouTubeOAuthUrl,
} from '../../lib/youtube-client.js';

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

function encodeState(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeState<T>(state: string): T {
  return JSON.parse(Buffer.from(state, 'base64url').toString()) as T;
}

function integrationsRedirect(platform: string): string {
  return `${getConfig().PUBLIC_API_URL.replace(':3000', ':3060')}/integrations/?connected=${platform}`;
}

export function getTikTokConnectUrl(businessId: string): string {
  const state = encodeState({ businessId, platform: 'tiktok' });
  return getTikTokOAuthUrl(state);
}

export function getLinkedInConnectUrl(businessId: string): string {
  const state = encodeState({ businessId, platform: 'linkedin' });
  return getLinkedInOAuthUrl(state);
}

export function getTwitterConnectUrl(businessId: string): string {
  const pkce = generatePkce();
  const state = encodeState({ businessId, platform: 'twitter', pkceVerifier: pkce.verifier });
  return getTwitterOAuthUrl(state, pkce.challenge);
}

export function getYouTubeConnectUrl(businessId: string): string {
  const state = encodeState({ businessId, platform: 'youtube' });
  return getYouTubeOAuthUrl(state);
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

export async function handleTikTokCallback(code: string, state: string): Promise<string> {
  const parsed = decodeState<{ businessId: string }>(state);
  const tokens = await exchangeTikTokCode(code);
  const user = await getTikTokUserInfo(tokens.access_token);
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : new Date(Date.now() + 86400000);

  await prisma.socialConnection.upsert({
    where: {
      businessId_platform: { businessId: parsed.businessId, platform: SocialPlatform.TIKTOK },
    },
    create: {
      businessId: parsed.businessId,
      platform: SocialPlatform.TIKTOK,
      accountId: user.open_id,
      accountName: user.display_name ?? 'TikTok',
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
      metadata: { openId: user.open_id },
    },
    update: {
      accountId: user.open_id,
      accountName: user.display_name ?? 'TikTok',
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
      metadata: { openId: user.open_id },
    },
  });

  return integrationsRedirect('tiktok');
}

export async function handleLinkedInCallback(code: string, state: string): Promise<string> {
  const parsed = decodeState<{ businessId: string }>(state);
  const tokens = await exchangeLinkedInCode(code);
  const orgs = await getLinkedInOrganizations(tokens.access_token);
  const org = orgs[0];
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : new Date(Date.now() + 60 * 86400000);

  await prisma.socialConnection.upsert({
    where: {
      businessId_platform: { businessId: parsed.businessId, platform: SocialPlatform.LINKEDIN },
    },
    create: {
      businessId: parsed.businessId,
      platform: SocialPlatform.LINKEDIN,
      accountId: org?.id,
      accountName: org?.name ?? 'LinkedIn',
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
      metadata: { organizationId: org?.id, organizationUrn: org ? `urn:li:organization:${org.id}` : null },
    },
    update: {
      accountId: org?.id,
      accountName: org?.name ?? 'LinkedIn',
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
      metadata: { organizationId: org?.id, organizationUrn: org ? `urn:li:organization:${org.id}` : null },
    },
  });

  return integrationsRedirect('linkedin');
}

export async function handleTwitterCallback(code: string, state: string): Promise<string> {
  const parsed = decodeState<{ businessId: string; pkceVerifier: string }>(state);
  const tokens = await exchangeTwitterCode(code, parsed.pkceVerifier);
  const user = await getTwitterUser(tokens.access_token);
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : new Date(Date.now() + 7200000);

  await prisma.socialConnection.upsert({
    where: {
      businessId_platform: { businessId: parsed.businessId, platform: SocialPlatform.TWITTER },
    },
    create: {
      businessId: parsed.businessId,
      platform: SocialPlatform.TWITTER,
      accountId: user.id,
      accountName: `@${user.username}`,
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
      metadata: { username: user.username },
    },
    update: {
      accountId: user.id,
      accountName: `@${user.username}`,
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
      metadata: { username: user.username },
    },
  });

  return integrationsRedirect('twitter');
}

export async function handleYouTubeCallback(code: string, state: string): Promise<string> {
  const parsed = decodeState<{ businessId: string }>(state);
  const tokens = await exchangeYouTubeCode(code);
  const channel = await getYouTubeChannel(tokens.access_token);
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : new Date(Date.now() + 3600000);

  await prisma.socialConnection.upsert({
    where: {
      businessId_platform: { businessId: parsed.businessId, platform: SocialPlatform.YOUTUBE },
    },
    create: {
      businessId: parsed.businessId,
      platform: SocialPlatform.YOUTUBE,
      accountId: channel.id,
      accountName: channel.title,
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
      metadata: { channelId: channel.id },
    },
    update: {
      accountId: channel.id,
      accountName: channel.title,
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
      metadata: { channelId: channel.id },
    },
  });

  return integrationsRedirect('youtube');
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
