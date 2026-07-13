export function getConfig() {
  return {
    AI_PORT: Number(process.env.AI_PORT ?? process.env.PORT ?? 3020),
    BUILD_REF: process.env.BUILD_REF ?? 'local',
    REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
    MANUS_API_KEY: process.env.MANUS_API_KEY ?? '',
    CORE_SERVICE_URL: process.env.CORE_SERVICE_URL ?? 'http://localhost:3010',
    PUBLIC_API_URL: process.env.PUBLIC_API_URL ?? 'http://localhost:3000',
  };
}
