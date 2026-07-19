import { getConfig } from '../config.js';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const YOUTUBE_UPLOAD = 'https://www.googleapis.com/upload/youtube/v3/videos';

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

export function getYouTubeOAuthUrl(state: string): string {
  const cfg = getConfig();
  const params = new URLSearchParams({
    client_id: cfg.YOUTUBE_CLIENT_ID || cfg.GOOGLE_CLIENT_ID,
    redirect_uri: cfg.YOUTUBE_REDIRECT_URI,
    response_type: 'code',
    scope: YOUTUBE_SCOPES.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export async function exchangeYouTubeCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const cfg = getConfig();
  const clientId = cfg.YOUTUBE_CLIENT_ID || cfg.GOOGLE_CLIENT_ID;
  const clientSecret = cfg.YOUTUBE_CLIENT_SECRET || cfg.GOOGLE_CLIENT_SECRET;
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: cfg.YOUTUBE_REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`YouTube token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>;
}

export async function getYouTubeChannel(accessToken: string): Promise<{ id: string; title: string }> {
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`YouTube channel fetch failed: ${await res.text()}`);
  const json = (await res.json()) as { items?: { id: string; snippet?: { title?: string } }[] };
  const ch = json.items?.[0];
  if (!ch) throw new Error('No YouTube channel found');
  return { id: ch.id, title: ch.snippet?.title ?? ch.id };
}

/** Resumable upload: fetch video from URL and upload to YouTube (Shorts-compatible). */
export async function publishYouTubeVideo(
  accessToken: string,
  opts: { videoUrl: string; title: string; description: string },
): Promise<string> {
  const videoRes = await fetch(opts.videoUrl);
  if (!videoRes.ok) throw new Error('Failed to fetch video for YouTube upload');
  const videoBytes = await videoRes.arrayBuffer();

  const initRes = await fetch(
    `${YOUTUBE_UPLOAD}?uploadType=resumable&part=snippet,status`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/*',
        'X-Upload-Content-Length': String(videoBytes.byteLength),
      },
      body: JSON.stringify({
        snippet: { title: opts.title.slice(0, 100), description: opts.description.slice(0, 5000) },
        status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
      }),
    },
  );
  if (!initRes.ok) throw new Error(`YouTube resumable init failed: ${await initRes.text()}`);
  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube missing upload location');

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/*' },
    body: videoBytes,
  });
  if (!uploadRes.ok) throw new Error(`YouTube upload failed: ${await uploadRes.text()}`);
  const json = (await uploadRes.json()) as { id?: string };
  if (!json.id) throw new Error('YouTube upload missing video id');
  return json.id;
}
