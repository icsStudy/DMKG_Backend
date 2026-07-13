import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './website.service.js';

export const websiteRouter = Router({ mergeParams: true });
websiteRouter.use(gatewayContext, requireAuth, requireBusiness);

websiteRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    success(res, await svc.generateWebsite(req.business!.id, req.body), 201);
  }),
);

websiteRouter.post(
  '/domain',
  asyncHandler(async (req, res) => {
    const domain = (req.body as { domain?: string }).domain ?? '';
    success(res, await svc.setDomain(req.business!.id, domain));
  }),
);

export const publicPagesRouter = Router();

publicPagesRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const html = await svc.servePublicPage(req.params.slug);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }),
);
