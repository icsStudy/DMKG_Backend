import { Router } from 'express';
import type { RequestHandler } from 'express';
import { config } from '../config.js';
import { createServiceProxy } from '../lib/create-service-proxy.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { webhooksLimiter, defaultLimiter } from '../middleware/rate-limit.js';

const socialProxy = createServiceProxy(config.SOCIAL_SERVICE_URL);

function chain(...handlers: RequestHandler[]): RequestHandler[] {
  return [...handlers, socialProxy as RequestHandler];
}

export const socialRouter = Router();

// OAuth callbacks — no auth
socialRouter.use('/api/v1/social/callback', socialProxy as RequestHandler);

// Inbound webhooks
socialRouter.use('/api/v1/webhooks/inbound', webhooksLimiter, socialProxy as RequestHandler);
socialRouter.get('/api/v1/webhooks/meta/leadgen', webhooksLimiter, socialProxy as RequestHandler);
socialRouter.post('/api/v1/webhooks/meta/leadgen', webhooksLimiter, socialProxy as RequestHandler);
socialRouter.get('/api/v1/webhooks/tiktok/leadgen', webhooksLimiter, socialProxy as RequestHandler);
socialRouter.post('/api/v1/webhooks/tiktok/leadgen', webhooksLimiter, socialProxy as RequestHandler);
socialRouter.post(
  '/api/v1/webhooks/linkedin/leadgen',
  webhooksLimiter,
  socialProxy as RequestHandler,
);

// Authenticated social + webhook management
socialRouter.get('/api/v1/webhooks/logs', ...chain(requireAuth));
socialRouter.post('/api/v1/webhooks/retry/:id', ...chain(requireAuth));
socialRouter.use('/api/v1/social', ...chain(requireAuth, defaultLimiter));
