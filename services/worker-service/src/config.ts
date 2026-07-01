import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BUILD_REF: z.string().default('local'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  SOCIAL_PUBLISH_MAX_MS: z.coerce.number().default(600_000),
  CORE_SERVICE_URL: z.string().default('http://localhost:3010'),
});

export type WorkerConfig = z.infer<typeof schema>;

let cached: WorkerConfig | null = null;

export function getConfig(): WorkerConfig {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
