import { getConfig } from '../config.js';

const cfg = getConfig();

export function graphUrl(path: string): string {
  return `https://graph.facebook.com/${cfg.META_GRAPH_API_VERSION}${path}`;
}

export async function graphGet<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(graphUrl(path));
  url.searchParams.set('access_token', accessToken);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta API GET ${path} failed: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function graphPost<T>(
  path: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(graphUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: accessToken }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API POST ${path} failed: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function getOAuthUrl(state: string, scopes: string[]): string {
  const params = new URLSearchParams({
    client_id: cfg.META_APP_ID,
    redirect_uri: cfg.META_REDIRECT_URI,
    state,
    scope: scopes.join(','),
    response_type: 'code',
  });
  return `https://www.facebook.com/${cfg.META_GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
}> {
  const params = new URLSearchParams({
    client_id: cfg.META_APP_ID,
    client_secret: cfg.META_APP_SECRET,
    redirect_uri: cfg.META_REDIRECT_URI,
    code,
  });
  const res = await fetch(graphUrl(`/oauth/access_token?${params.toString()}`));
  if (!res.ok) throw new Error('OAuth token exchange failed');
  return res.json() as Promise<{ access_token: string; token_type: string; expires_in?: number }>;
}

export async function getLongLivedToken(shortToken: string): Promise<string> {
  const data = await graphGet<{ access_token: string }>('/oauth/access_token', shortToken, {
    grant_type: 'fb_exchange_token',
    client_id: cfg.META_APP_ID,
    client_secret: cfg.META_APP_SECRET,
    fb_exchange_token: shortToken,
  });
  return data.access_token;
}

export async function publishToMetaPage(
  pageId: string,
  accessToken: string,
  message: string,
  link?: string,
): Promise<string> {
  const body: Record<string, unknown> = { message };
  if (link) body.link = link;
  const result = await graphPost<{ id: string }>(`/${pageId}/feed`, accessToken, body);
  return result.id;
}

export async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  caption: string,
  imageUrl: string,
): Promise<string> {
  const container = await graphPost<{ id: string }>(`/${igUserId}/media`, accessToken, {
    image_url: imageUrl,
    caption,
  });
  const published = await graphPost<{ id: string }>(
    `/${igUserId}/media_publish`,
    accessToken,
    { creation_id: container.id },
  );
  return published.id;
}
