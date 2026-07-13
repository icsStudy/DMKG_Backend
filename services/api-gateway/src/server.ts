import express from 'express';
import { httpLogger, logger } from '@spacode/utils';
import { config } from './config.js';
import { createRawServiceProxy } from './lib/create-service-proxy.js';
import { requestId } from './middleware/request-id.js';
import { corsMiddleware } from './middleware/cors.js';
import { webhooksLimiter } from './middleware/rate-limit.js';
import { mountRoutes } from './routes/index.js';

const app = express();

const stripeProxy = createRawServiceProxy(config.CORE_SERVICE_URL);

app.use(requestId);
app.use(httpLogger);
app.use(corsMiddleware);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api-gateway', buildRef: config.BUILD_REF });
});

/** Used by e2e/CI — returns 503 until downstream services (and admin static) are up. */
app.get('/health/ready', async (_req, res) => {
  const adminUrl = config.CORS_ORIGIN.replace(/\/$/, '');
  const checks = [
    fetch(`${config.CORE_SERVICE_URL}/health/full`),
    fetch(`${config.AI_SERVICE_URL}/health`),
    fetch(`${config.SOCIAL_SERVICE_URL}/health`),
    fetch(adminUrl),
  ];

  try {
    const results = await Promise.all(checks);
    if (results.every((r) => r.ok || r.status < 500)) {
      return res.json({ ok: true, service: 'api-gateway', buildRef: config.BUILD_REF });
    }
  } catch {
    // downstream not ready yet
  }
  res.status(503).json({ ok: false, service: 'api-gateway', buildRef: config.BUILD_REF });
});

// Stripe webhook needs raw body for signature verification in core-service
app.post(
  '/api/v1/webhooks/stripe',
  express.raw({ type: 'application/json', limit: '2mb' }),
  webhooksLimiter,
  stripeProxy,
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

mountRoutes(app);

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'api-gateway listening');
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down api-gateway');
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
