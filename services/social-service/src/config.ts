export function getConfig() {
  return {
    SOCIAL_PORT: Number(process.env.SOCIAL_PORT ?? process.env.PORT ?? 3030),
    BUILD_REF: process.env.BUILD_REF ?? 'local',
    REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? '',
    CORE_SERVICE_URL: process.env.CORE_SERVICE_URL ?? 'http://localhost:3010',
    META_APP_ID: process.env.META_APP_ID ?? '',
    META_APP_SECRET: process.env.META_APP_SECRET ?? '',
    META_REDIRECT_URI: process.env.META_REDIRECT_URI ?? 'http://localhost:3000/api/v1/social/callback/meta',
    META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION ?? 'v21.0',
    META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'spacode-meta-verify',
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? 'spacode-wa-verify',
    META_WABA_CONFIG_ID: process.env.META_WABA_CONFIG_ID ?? '',
    PUBLIC_API_URL: process.env.PUBLIC_API_URL ?? 'http://localhost:3000',
  };
}
