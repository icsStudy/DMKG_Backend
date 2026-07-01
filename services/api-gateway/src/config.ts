import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  BUILD_REF: z.string().default('local'),
  CORE_SERVICE_URL: z.string().url().default('http://localhost:3010'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:3020'),
  SOCIAL_SERVICE_URL: z.string().url().default('http://localhost:3030'),
  JWT_PUBLIC_KEY: z.string().min(1),
  PUBLIC_API_KEY: z.string().min(1),
  ADMIN_API_KEY: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:3060'),
});

export type GatewayConfig = z.infer<typeof envSchema>;

export const config: GatewayConfig = envSchema.parse(process.env);
