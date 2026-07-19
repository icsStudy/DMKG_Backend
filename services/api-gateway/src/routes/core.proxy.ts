import { Router } from 'express';
import type { RequestHandler } from 'express';
import { config } from '../config.js';
import { createServiceProxy } from '../lib/create-service-proxy.js';
import {
  requireAuth,
  requireApiKey,
  requireAuthOrPublicApiKey,
} from '../middleware/auth.middleware.js';
import {
  authLimiter,
  leadsLimiter,
  emailLimiter,
  analyticsLimiter,
  defaultLimiter,
} from '../middleware/rate-limit.js';

const coreProxy = createServiceProxy(config.CORE_SERVICE_URL);

function chain(...handlers: RequestHandler[]): RequestHandler[] {
  return [...handlers, coreProxy as RequestHandler];
}

export const coreRouter = Router();

// Public bio pages
coreRouter.get('/public/bio/:slug', coreProxy as RequestHandler);

// Auth — no JWT
coreRouter.use('/api/v1/auth', authLimiter, coreProxy as RequestHandler);

// Billing plans — public
coreRouter.get('/api/v1/billing/plans', coreProxy as RequestHandler);

// Contact form
coreRouter.post('/api/contact', ...chain(leadsLimiter));

// Legacy admin email API
coreRouter.use('/api/email', ...chain(requireApiKey('admin')));

// Leads — POST allows API key or JWT
coreRouter.post('/api/v1/leads', ...chain(requireAuthOrPublicApiKey));
coreRouter.use(
  '/api/v1/leads',
  ...chain(requireAuth as RequestHandler, leadsLimiter),
);

// Analytics
coreRouter.use(
  '/api/v1/analytics',
  ...chain(requireAuth, analyticsLimiter),
);

// Email
coreRouter.use('/api/v1/email', ...chain(requireAuth, emailLimiter));

// Billing (except plans)
coreRouter.use('/api/v1/billing', ...chain(requireAuth));

// Profile
coreRouter.use('/api/v1/profile', ...chain(requireAuth));

// CRM
coreRouter.use('/api/v1/crm', ...chain(requireAuth));

// Admin
coreRouter.use('/api/v1/admin', ...chain(requireAuth));

// Business integrations & SEO
coreRouter.use(
  '/api/v1/businesses/:id/integrations',
  ...chain(requireAuth),
);
coreRouter.use('/api/v1/businesses/:id/seo', ...chain(requireAuth));
coreRouter.use('/api/v1/seo', ...chain(requireAuth, defaultLimiter));

// Businesses CRUD
coreRouter.use('/api/v1/businesses', ...chain(requireAuth, defaultLimiter));
