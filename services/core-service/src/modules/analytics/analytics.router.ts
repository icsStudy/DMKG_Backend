import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './analytics.service.js';

export const analyticsRouter = Router();
analyticsRouter.use(gatewayContext, requireAuth, requireBusiness);

analyticsRouter.get(
  '/overview',
  asyncHandler(async (req, res) => {
    success(res, await svc.getOverview(req.business!.id));
  }),
);

analyticsRouter.get(
  '/funnel',
  asyncHandler(async (req, res) => {
    success(res, await svc.getFunnel(req.business!.id));
  }),
);

analyticsRouter.get(
  '/trends',
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days) || 30;
    success(res, await svc.getTrends(req.business!.id, days));
  }),
);

analyticsRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    success(res, await svc.exportAnalytics(req.business!.id));
  }),
);
