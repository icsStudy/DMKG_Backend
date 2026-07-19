import { getConfig } from '../config.js';

const LINKEDIN_AUTH = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_API = 'https://api.linkedin.com/v2';

export const LINKEDIN_SCOPES = ['w_member_social', 'w_organization_social', 'r_organization_social'];

export function getLinkedInOAuthUrl(state: string): string {
  const cfg = getConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.LINKEDIN_CLIENT_ID,
    redirect_uri: cfg.LINKEDIN_REDIRECT_URI,
    state,
    scope: LINKEDIN_SCOPES.join(' '),
  });
  return `${LINKEDIN_AUTH}?${params.toString()}`;
}

export async function exchangeLinkedInCode(code: string): Promise<{
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
}> {
  const cfg = getConfig();
  const res = await fetch(LINKEDIN_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: cfg.LINKEDIN_CLIENT_ID,
      client_secret: cfg.LINKEDIN_CLIENT_SECRET,
      redirect_uri: cfg.LINKEDIN_REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; expires_in?: number; refresh_token?: string }>;
}

export async function getLinkedInOrganizations(accessToken: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch(
    `${LINKEDIN_API}/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName,id)))`,
    { headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' } },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    elements?: { 'organization~'?: { id: number; localizedName?: string } }[];
  };
  return (json.elements ?? [])
    .map((e) => e['organization~'])
    .filter((o): o is { id: number; localizedName?: string } => !!o?.id)
    .map((o) => ({ id: String(o.id), name: o.localizedName ?? `Org ${o.id}` }));
}

export async function publishLinkedInPost(
  accessToken: string,
  organizationUrn: string,
  text: string,
  mediaUrl?: string,
): Promise<string> {
  const author = organizationUrn.startsWith('urn:') ? organizationUrn : `urn:li:organization:${organizationUrn}`;
  const body: Record<string, unknown> = {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: mediaUrl ? 'ARTICLE' : 'NONE',
        ...(mediaUrl && {
          media: [{ status: 'READY', originalUrl: mediaUrl }],
        }),
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };
  const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LinkedIn publish failed: ${await res.text()}`);
  const id = res.headers.get('x-restli-id') ?? `li-${Date.now()}`;
  return id;
}
