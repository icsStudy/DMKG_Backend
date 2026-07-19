import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './competitors.service.js';

export const competitorsRouter = Router({ mergeParams: true });
competitorsRouter.use(gatewayContext, requireAuth, requireBusiness);

competitorsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    success(res, await svc.listCompetitorInsights(req.business!.id));
  }),
);

competitorsRouter.post(
  '/analyze',
  asyncHandler(async (req, res) => {
    success(res, await svc.analyzeCompetitor(req.business!.id, req.body), 201);
  }),
);
