import { createHash, randomBytes } from 'crypto';
import { getConfig } from '../config.js';

const X_AUTH = 'https://twitter.com/i/oauth2/authorize';
const X_TOKEN = 'https://api.twitter.com/2/oauth2/token';
const X_API = 'https://api.twitter.com/2';

export const X_SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function getTwitterOAuthUrl(state: string, codeChallenge: string): string {
  const cfg = getConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.X_CLIENT_ID,
    redirect_uri: cfg.X_REDIRECT_URI,
    scope: X_SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${X_AUTH}?${params.toString()}`;
}

export async function exchangeTwitterCode(
  code: string,
  codeVerifier: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const cfg = getConfig();
  const res = await fetch(X_TOKEN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${cfg.X_CLIENT_ID}:${cfg.X_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.X_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) throw new Error(`X token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>;
}

export async function getTwitterUser(accessToken: string): Promise<{ id: string; username: string }> {
  const res = await fetch(`${X_API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`X user info failed: ${await res.text()}`);
  const json = (await res.json()) as { data?: { id: string; username: string } };
  if (!json.data) throw new Error('X user info missing data');
  return json.data;
}

export async function publishTweet(accessToken: string, text: string): Promise<string> {
  const res = await fetch(`${X_API}/tweets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: text.slice(0, 280) }),
  });
  if (!res.ok) throw new Error(`X publish failed: ${await res.text()}`);
  const json = (await res.json()) as { data?: { id: string } };
  if (!json.data?.id) throw new Error('X publish missing tweet id');
  return json.data.id;
}
