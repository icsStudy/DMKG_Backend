import { execSync } from 'child_process';
import { join } from 'path';
import express from 'express';
import { logger } from '@spacode/utils';
import { getConfig } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { gatewayContext } from './middleware/gateway-context.js';
import { marketingRouter } from './modules/marketing/marketing.router.js';
import { contentItemsRouter } from './modules/content-items/content-items.router.js';
import { websiteRouter, publicPagesRouter } from './modules/website/website.router.js';
import { getRedis, aiContentProgressChannel } from './lib/redis.js';
import { prisma } from '@spacode/db';

const cfg = getConfig();
const PORT = cfg.AI_PORT;
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
  res.json({ ok: true, service: 'ai-service', buildRef: BUILD_REF });
});

app.use('/api/v1/businesses/:id/marketing', marketingRouter);
app.use('/api/v1/businesses/:id/content-items', contentItemsRouter);
app.use('/api/v1/businesses/:id/website', websiteRouter);
app.use('/p', publicPagesRouter);

app.get(
  '/api/v1/businesses/:id/marketing/runs/:runId/stream',
  async (req, res) => {
    const runId = req.params.runId;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const redis = getRedis();
    const channel = aiContentProgressChannel(runId);
    const sub = redis.duplicate();
    await sub.subscribe(channel);

    const send = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const run = await prisma.marketingAutomationRun.findUnique({ where: { id: runId } });
    if (run) {
      send({ runId, status: run.status, progress: run.progress });
      if (run.status === 'completed' || run.status === 'failed') {
        res.end();
        await sub.unsubscribe(channel);
        await sub.quit();
        return;
      }
    }

    sub.on('message', (_ch, message) => {
      send(JSON.parse(message));
    });

    req.on('close', () => {
      void sub.unsubscribe(channel);
      void sub.quit();
    });
  },
);

app.use(errorHandler);

async function main() {
  runMigrations();
  app.listen(PORT, () => {
    logger.info(`ai-service listening on :${PORT}`);
  });
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});

export { app };
