import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './creative-videos.service.js';

export const creativeVideosRouter = Router({ mergeParams: true });
creativeVideosRouter.use(gatewayContext, requireAuth, requireBusiness);

creativeVideosRouter.post(
  '/generate',
  asyncHandler(async (req, res) => {
    success(res, await svc.startVideoGeneration(req.business!.id, req.body), 201);
  }),
);

creativeVideosRouter.get(
  '/:jobId',
  asyncHandler(async (req, res) => {
    success(res, await svc.getVideoJob(req.business!.id, req.params.jobId));
  }),
);
