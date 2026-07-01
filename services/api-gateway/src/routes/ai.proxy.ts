import { Router } from 'express';
import type { RequestHandler } from 'express';
import { config } from '../config.js';
import { createServiceProxy } from '../lib/create-service-proxy.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { defaultLimiter } from '../middleware/rate-limit.js';

const aiProxy = createServiceProxy(config.AI_SERVICE_URL);

function chain(...handlers: RequestHandler[]): RequestHandler[] {
  return [...handlers, aiProxy as RequestHandler];
}

export const aiRouter = Router();

// Public landing pages
aiRouter.get('/p/:slug', aiProxy as RequestHandler);

// Authenticated AI routes
aiRouter.use(
  '/api/v1/businesses/:id/marketing',
  ...chain(requireAuth, defaultLimiter),
);
aiRouter.use(
  '/api/v1/businesses/:id/content-items',
  ...chain(requireAuth, defaultLimiter),
);
aiRouter.use(
  '/api/v1/businesses/:id/website',
  ...chain(requireAuth, defaultLimiter),
);

// Manus webhook (proxied to ai-service)
aiRouter.post('/api/v1/webhooks/manus', aiProxy as RequestHandler);
