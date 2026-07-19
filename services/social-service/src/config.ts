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
    TIKTOK_CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY ?? '',
    TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET ?? '',
    TIKTOK_REDIRECT_URI:
      process.env.TIKTOK_REDIRECT_URI ?? 'http://localhost:3000/api/v1/social/callback/tiktok',
    TIKTOK_WEBHOOK_VERIFY_TOKEN: process.env.TIKTOK_WEBHOOK_VERIFY_TOKEN ?? 'spacode-tiktok-verify',
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID ?? '',
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET ?? '',
    LINKEDIN_REDIRECT_URI:
      process.env.LINKEDIN_REDIRECT_URI ?? 'http://localhost:3000/api/v1/social/callback/linkedin',
    X_CLIENT_ID: process.env.X_CLIENT_ID ?? '',
    X_CLIENT_SECRET: process.env.X_CLIENT_SECRET ?? '',
    X_REDIRECT_URI: process.env.X_REDIRECT_URI ?? 'http://localhost:3000/api/v1/social/callback/twitter',
    YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID ?? '',
    YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET ?? '',
    YOUTUBE_REDIRECT_URI:
      process.env.YOUTUBE_REDIRECT_URI ?? 'http://localhost:3000/api/v1/social/callback/youtube',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',
  };
}
