import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORE_PORT: z.coerce.number().default(3010),
  PORT: z.coerce.number().optional(),
  BUILD_REF: z.string().default('local'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3060'),
  AI_SERVICE_URL: z.string().default('http://localhost:3020'),
});

export type Config = z.infer<typeof schema>;

let cached: Config | null = null;

export function getConfig(): Config {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
