import { getConfig } from '../config.js';

const TIKTOK_AUTH = 'https://www.tiktok.com/v2/auth/authorize';
const TIKTOK_API = 'https://open.tiktokapis.com';

export const TIKTOK_SCOPES = ['user.info.basic', 'video.publish', 'video.upload'];

export function getTikTokOAuthUrl(state: string): string {
  const cfg = getConfig();
  const params = new URLSearchParams({
    client_key: cfg.TIKTOK_CLIENT_KEY,
    redirect_uri: cfg.TIKTOK_REDIRECT_URI,
    state,
    scope: TIKTOK_SCOPES.join(','),
    response_type: 'code',
  });
  return `${TIKTOK_AUTH}?${params.toString()}`;
}

export async function exchangeTikTokCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  open_id?: string;
}> {
  const cfg = getConfig();
  const res = await fetch(`${TIKTOK_API}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: cfg.TIKTOK_CLIENT_KEY,
      client_secret: cfg.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: cfg.TIKTOK_REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`);
  const json = (await res.json()) as { data?: { access_token: string; refresh_token?: string; expires_in?: number; open_id?: string } };
  const data = json.data;
  if (!data?.access_token) throw new Error('TikTok token exchange returned no access_token');
  return data;
}

export async function refreshTikTokToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const cfg = getConfig();
  const res = await fetch(`${TIKTOK_API}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: cfg.TIKTOK_CLIENT_KEY,
      client_secret: cfg.TIKTOK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`TikTok token refresh failed: ${await res.text()}`);
  const json = (await res.json()) as { data?: { access_token: string; refresh_token?: string; expires_in?: number } };
  const data = json.data;
  if (!data?.access_token) throw new Error('TikTok refresh returned no access_token');
  return data;
}

export async function getTikTokUserInfo(accessToken: string): Promise<{ open_id: string; display_name?: string }> {
  const res = await fetch(`${TIKTOK_API}/v2/user/info/?fields=open_id,display_name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`TikTok user info failed: ${await res.text()}`);
  const json = (await res.json()) as { data?: { user?: { open_id: string; display_name?: string } } };
  const user = json.data?.user;
  if (!user?.open_id) throw new Error('TikTok user info missing open_id');
  return user;
}

export async function initTikTokVideoPublish(
  accessToken: string,
  opts: { videoUrl: string; title: string; privacyLevel?: string },
): Promise<string> {
  const res = await fetch(`${TIKTOK_API}/v2/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: opts.title.slice(0, 2200),
        privacy_level: opts.privacyLevel ?? 'SELF_ONLY',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: opts.videoUrl,
      },
    }),
  });
  if (!res.ok) throw new Error(`TikTok publish init failed: ${await res.text()}`);
  const json = (await res.json()) as { data?: { publish_id?: string } };
  const publishId = json.data?.publish_id;
  if (!publishId) throw new Error('TikTok publish init missing publish_id');
  return publishId;
}

export async function fetchTikTokPublishStatus(
  accessToken: string,
  publishId: string,
): Promise<{ status: string; publicaly_available_post_id?: string[] }> {
  const res = await fetch(`${TIKTOK_API}/v2/post/publish/status/fetch/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ publish_id: publishId }),
  });
  if (!res.ok) throw new Error(`TikTok status fetch failed: ${await res.text()}`);
  const json = (await res.json()) as {
    data?: { status: string; publicaly_available_post_id?: string[] };
  };
  return json.data ?? { status: 'UNKNOWN' };
}

export async function pollTikTokPublishComplete(
  accessToken: string,
  publishId: string,
  maxMs = 30_000,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const status = await fetchTikTokPublishStatus(accessToken, publishId);
    if (status.status === 'PUBLISH_COMPLETE') {
      return status.publicaly_available_post_id?.[0] ?? publishId;
    }
    if (status.status === 'FAILED') throw new Error('TikTok publish failed');
    await new Promise((r) => setTimeout(r, 2000));
  }
  return publishId;
}
