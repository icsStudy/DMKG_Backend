import { createHmac, createHash, timingSafeEqual } from 'crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyHmac(payload: string, signature: string, secret: string): boolean {
  return verifyWebhookHmac(Buffer.from(payload), signature, secret);
}

export function verifyWebhookHmac(
  rawBody: Buffer,
  signature: string,
  secret: string,
): boolean {
  const [algo, sigHex] = signature.split('=');
  if (algo !== 'sha256' || !sigHex) {
    return false;
  }

  const hmac = createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(sigHex, 'hex'), Buffer.from(hmac, 'hex'));
  } catch {
    return false;
  }
}
