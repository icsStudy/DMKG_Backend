import { execSync } from 'child_process';
import { join } from 'path';
import express from 'express';
import { logger } from '@spacode/utils';
import { getConfig } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { gatewayContext } from './middleware/gateway-context.js';
import { connectionsRouter, callbackRouter } from './modules/connections/connections.router.js';
import { publishRouter } from './modules/publish/publish.router.js';
import { metaAdsRouter } from './modules/meta-ads/meta-ads.router.js';
import { whatsappRouter } from './modules/whatsapp/whatsapp.router.js';
import { webhooksMgmtRouter, webhooksPublicRouter } from './modules/webhooks/webhooks.router.js';

const cfg = getConfig();
const PORT = cfg.SOCIAL_PORT;
const BUILD_REF = cfg.BUILD_REF;

function runMigrations(): void {
  try {
    const dbPkg = join(process.cwd(), '../../packages/db');
    execSync('npx prisma migrate deploy', { cwd: dbPkg, stdio: 'inherit', env: process.env });
  } catch (err) {
    logger.warn({ err }, 'Migration deploy skipped or failed (dev ok)');
  }
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(gatewayContext);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'social-service', buildRef: BUILD_REF });
});

app.use('/api/v1/social/callback', callbackRouter);
app.use('/api/v1/social', connectionsRouter);
app.use('/api/v1/social', publishRouter);
app.use('/api/v1/social/meta', metaAdsRouter);
app.use('/api/v1/businesses/:id/whatsapp', whatsappRouter);
app.use('/api/v1/businesses/:id/meta', metaAdsRouter);
app.use('/api/v1/webhooks', webhooksPublicRouter);
app.use('/api/v1/webhooks', webhooksMgmtRouter);

app.use(errorHandler);

async function main() {
  runMigrations();
  app.listen(PORT, () => {
    logger.info(`social-service listening on :${PORT}`);
  });
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});

export { app };
