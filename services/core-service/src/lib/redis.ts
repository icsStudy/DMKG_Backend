import { Redis } from 'ioredis';
import { getConfig } from '../config.js';

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(getConfig().REDIS_URL, { maxRetriesPerRequest: null });
  }
  return client;
}

export const OTP_PREFIX = 'otp:';
export const OTP_TTL_SEC = 600;
