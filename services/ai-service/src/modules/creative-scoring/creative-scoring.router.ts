import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './creative-scoring.service.js';

export const creativeScoringRouter = Router({ mergeParams: true });
creativeScoringRouter.use(gatewayContext, requireAuth, requireBusiness);

creativeScoringRouter.post(
  '/:itemId/score',
  asyncHandler(async (req, res) => {
    success(res, await svc.scoreContentItem(req.business!.id, req.params.itemId), 201);
  }),
);

creativeScoringRouter.get(
  '/:itemId/score',
  asyncHandler(async (req, res) => {
    success(res, await svc.getLatestScore(req.business!.id, req.params.itemId));
  }),
);
