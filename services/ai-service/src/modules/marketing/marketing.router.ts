import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './marketing.service.js';

export const marketingRouter = Router({ mergeParams: true });
marketingRouter.use(gatewayContext, requireAuth, requireBusiness);

marketingRouter.get(
  '/plans',
  asyncHandler(async (req, res) => {
    success(res, await svc.listPlans(req.business!.id));
  }),
);

marketingRouter.post(
  '/plans',
  asyncHandler(async (req, res) => {
    const body = req.body as { horizonDays?: 30 | 90; strategy?: string };
    const result = await svc.createPlan(req.business!.id, {
      horizonDays: body.horizonDays ?? 30,
      strategy: body.strategy,
    });
    success(res, result, 201);
  }),
);

marketingRouter.get(
  '/plans/:planId',
  asyncHandler(async (req, res) => {
    success(res, await svc.getPlan(req.business!.id, req.params.planId));
  }),
);

marketingRouter.get(
  '/runs/:runId/progress',
  asyncHandler(async (req, res) => {
    success(res, await svc.getRunProgress(req.business!.id, req.params.runId));
  }),
);
