import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './seo.service.js';

export const seoRouter = Router();
seoRouter.use(gatewayContext, requireAuth, requireBusiness);

seoRouter.get(
  '/profile',
  asyncHandler(async (req, res) => {
    success(res, await svc.getOrCreateProfile(req.business!.id));
  }),
);

seoRouter.put(
  '/profile',
  asyncHandler(async (req, res) => {
    success(res, await svc.updateProfile(req.business!.id, req.body));
  }),
);

seoRouter.post(
  '/audit',
  asyncHandler(async (req, res) => {
    success(res, await svc.runAudit(req.business!.id), 201);
  }),
);

seoRouter.get(
  '/audits',
  asyncHandler(async (req, res) => {
    success(res, await svc.listAudits(req.business!.id));
  }),
);

seoRouter.get(
  '/google',
  asyncHandler(async (req, res) => {
    success(res, await svc.getGoogleIntegration(req.business!.id));
  }),
);

seoRouter.post(
  '/google/connect',
  asyncHandler(async (req, res) => {
    success(res, await svc.connectGoogle(req.business!.id, req.body), 201);
  }),
);

seoRouter.post(
  '/google/sync',
  asyncHandler(async (req, res) => {
    success(res, await svc.syncGoogle(req.business!.id));
  }),
);
