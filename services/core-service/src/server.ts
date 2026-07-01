import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import { execSync } from 'child_process';
import { prisma } from '@spacode/db';
import { logger } from '@spacode/utils';
import { getConfig } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { gatewayContext } from './middleware/gateway-context.js';
import { authRouter, profile2faRouter } from './modules/auth/auth.router.js';
import { businessesRouter } from './modules/businesses/businesses.router.js';
import { leadsRouter, contactRouter } from './modules/leads/leads.router.js';
import { billingRouter, stripeWebhookRouter } from './modules/billing/billing.router.js';
import { adminRouter } from './modules/admin/admin.router.js';
import { analyticsRouter } from './modules/analytics/analytics.router.js';
import { emailRouter } from './modules/email/email.router.js';
import { seoRouter } from './modules/seo/seo.router.js';
import { crmRouter } from './modules/crm/crm.router.js';

const cfg = getConfig();
const PORT = cfg.CORE_PORT ?? cfg.PORT ?? 3010;
const BUILD_REF = cfg.BUILD_REF;

function runMigrations(): void {
  try {
    const dbPkg = join(dirname(fileURLToPath(import.meta.url)), '../../../packages/db');
    execSync('npx prisma migrate deploy', {
      cwd: dbPkg,
      stdio: 'inherit',
      env: process.env,
    });
  } catch (err) {
    logger.warn({ err }, 'Migration deploy skipped or failed (dev ok)');
  }
}

const app = express();

app.use(gatewayContext);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'core-service', buildRef: BUILD_REF });
});

app.get('/health/full', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: 'core-service', db: 'up', buildRef: BUILD_REF });
  } catch {
    res.status(503).json({ ok: false, service: 'core-service', db: 'down', buildRef: BUILD_REF });
  }
});

app.use('/api/v1/webhooks/stripe', stripeWebhookRouter);

app.use(express.json({ limit: '2mb' }));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/profile/2fa', profile2faRouter);
app.use('/api/v1/businesses', businessesRouter);
app.use('/api/v1/leads', leadsRouter);
app.use('/api/contact', contactRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/email', emailRouter);
app.use('/api/v1/seo', seoRouter);
app.use('/api/v1/crm', crmRouter);

app.use(errorHandler);

async function main() {
  runMigrations();
  app.listen(PORT, () => {
    logger.info(`core-service listening on :${PORT}`);
  });
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});

export { app };
