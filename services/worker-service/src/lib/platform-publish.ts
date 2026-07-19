import { SocialPlatform, type SocialConnection } from '@spacode/db';
import { decrypt } from '@spacode/utils';

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION ?? 'v21.0';
const TIKTOK_API = 'https://open.tiktokapis.com';
const LINKEDIN_API = 'https://api.linkedin.com/v2';
const X_API = 'https://api.twitter.com/2';

async function graphPost(path: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ id: string }>;
}

export async function publishMeta(
  conn: SocialConnection,
  platform: string,
  content: string,
  mediaUrl?: string,
): Promise<string> {
  const token = decrypt(conn.accessToken);
  const meta = conn.metadata as { pageId?: string } | null;
  const pageId = meta?.pageId ?? conn.accountId;
  if (!pageId) throw new Error('No Meta page configured');

  if (platform === 'instagram' && mediaUrl) {
    const igAccounts = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}?fields=instagram_business_account&access_token=${token}`,
    ).then((r) => r.json() as Promise<{ instagram_business_account?: { id: string } }>);
    const igId = igAccounts.instagram_business_account?.id;
    if (!igId) throw new Error('No Instagram business account linked');
    const container = await graphPost(`/${igId}/media`, token, {
      image_url: mediaUrl,
      caption: content,
    });
    const published = await graphPost(`/${igId}/media_publish`, token, {
      creation_id: container.id,
    });
    return published.id;
  }

  const result = await graphPost(`/${pageId}/feed`, token, {
    message: content,
    ...(mediaUrl && { link: mediaUrl }),
  });
  return result.id;
}

export async function publishTikTok(
  conn: SocialConnection,
  content: string,
  mediaUrl?: string,
): Promise<string> {
  if (!mediaUrl) throw new Error('TikTok requires video or image URL');
  const token = decrypt(conn.accessToken);

  const initRes = await fetch(`${TIKTOK_API}/v2/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: content.slice(0, 2200),
        privacy_level: process.env.TIKTOK_PUBLISH_PRIVACY ?? 'SELF_ONLY',
      },
      source_info: { source: 'PULL_FROM_URL', video_url: mediaUrl },
    }),
  });
  if (!initRes.ok) throw new Error(`TikTok publish init: ${await initRes.text()}`);
  const initJson = (await initRes.json()) as { data?: { publish_id?: string } };
  const publishId = initJson.data?.publish_id;
  if (!publishId) throw new Error('TikTok missing publish_id');

  const start = Date.now();
  while (Date.now() - start < 30_000) {
    const statusRes = await fetch(`${TIKTOK_API}/v2/post/publish/status/fetch/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    if (!statusRes.ok) throw new Error(`TikTok status: ${await statusRes.text()}`);
    const statusJson = (await statusRes.json()) as {
      data?: { status: string; publicaly_available_post_id?: string[] };
    };
    const st = statusJson.data?.status;
    if (st === 'PUBLISH_COMPLETE') {
      return statusJson.data?.publicaly_available_post_id?.[0] ?? publishId;
    }
    if (st === 'FAILED') throw new Error('TikTok publish failed');
    await new Promise((r) => setTimeout(r, 2000));
  }
  return publishId;
}

export async function publishLinkedIn(
  conn: SocialConnection,
  content: string,
  mediaUrl?: string,
): Promise<string> {
  const token = decrypt(conn.accessToken);
  const meta = conn.metadata as { organizationUrn?: string; organizationId?: string } | null;
  const author =
    meta?.organizationUrn ??
    (meta?.organizationId ? `urn:li:organization:${meta.organizationId}` : null);
  if (!author) throw new Error('No LinkedIn organization configured');

  const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: mediaUrl ? 'ARTICLE' : 'NONE',
          ...(mediaUrl && { media: [{ status: 'READY', originalUrl: mediaUrl }] }),
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn publish: ${await res.text()}`);
  return res.headers.get('x-restli-id') ?? `li-${Date.now()}`;
}

export async function publishTwitter(conn: SocialConnection, content: string): Promise<string> {
  const token = decrypt(conn.accessToken);
  const res = await fetch(`${X_API}/tweets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: content.slice(0, 280) }),
  });
  if (!res.ok) throw new Error(`X publish: ${await res.text()}`);
  const json = (await res.json()) as { data?: { id: string } };
  if (!json.data?.id) throw new Error('X publish missing id');
  return json.data.id;
}

export async function publishYouTube(
  conn: SocialConnection,
  content: string,
  mediaUrl?: string,
): Promise<string> {
  if (!mediaUrl) throw new Error('YouTube requires video URL');
  const token = decrypt(conn.accessToken);
  const videoRes = await fetch(mediaUrl);
  if (!videoRes.ok) throw new Error('Failed to fetch video for YouTube');
  const videoBytes = await videoRes.arrayBuffer();

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/*',
        'X-Upload-Content-Length': String(videoBytes.byteLength),
      },
      body: JSON.stringify({
        snippet: { title: content.slice(0, 100), description: content },
        status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
      }),
    },
  );
  if (!initRes.ok) throw new Error(`YouTube init: ${await initRes.text()}`);
  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube missing upload URL');

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/*' },
    body: videoBytes,
  });
  if (!uploadRes.ok) throw new Error(`YouTube upload: ${await uploadRes.text()}`);
  const json = (await uploadRes.json()) as { id?: string };
  if (!json.id) throw new Error('YouTube missing video id');
  return json.id;
}

export async function postMetaFirstComment(
  conn: SocialConnection,
  postExternalId: string,
  comment: string,
): Promise<void> {
  const token = decrypt(conn.accessToken);
  await graphPost(`/${postExternalId}/comments`, token, { message: comment });
}

export function connectionPlatformKey(platform: string): string {
  if (platform === 'instagram' || platform === 'facebook' || platform === 'meta') {
    return SocialPlatform.META;
  }
  return platform;
}

export async function publishToPlatform(
  platform: string,
  conn: SocialConnection,
  content: string,
  mediaUrl?: string,
): Promise<string> {
  switch (platform) {
    case 'meta':
    case 'facebook':
    case 'instagram':
      return publishMeta(conn, platform, content, mediaUrl);
    case SocialPlatform.TIKTOK:
      return publishTikTok(conn, content, mediaUrl);
    case SocialPlatform.LINKEDIN:
      return publishLinkedIn(conn, content, mediaUrl);
    case SocialPlatform.TWITTER:
      return publishTwitter(conn, content);
    case SocialPlatform.YOUTUBE:
      return publishYouTube(conn, content, mediaUrl);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export async function pollTikTokInFlight(
  conn: SocialConnection,
  publishId: string,
): Promise<string | null> {
  const token = decrypt(conn.accessToken);
  const statusRes = await fetch(`${TIKTOK_API}/v2/post/publish/status/fetch/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ publish_id: publishId }),
  });
  if (!statusRes.ok) return null;
  const statusJson = (await statusRes.json()) as {
    data?: { status: string; publicaly_available_post_id?: string[] };
  };
  if (statusJson.data?.status === 'PUBLISH_COMPLETE') {
    return statusJson.data.publicaly_available_post_id?.[0] ?? publishId;
  }
  if (statusJson.data?.status === 'FAILED') return null;
  return null;
}
