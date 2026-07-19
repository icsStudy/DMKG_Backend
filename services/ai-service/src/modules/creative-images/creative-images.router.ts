import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './creative-images.service.js';

export const creativeImagesRouter = Router({ mergeParams: true });
creativeImagesRouter.use(gatewayContext, requireAuth, requireBusiness);

creativeImagesRouter.post(
  '/generate',
  asyncHandler(async (req, res) => {
    success(res, await svc.generateCreativeImage(req.business!.id, req.body), 201);
  }),
);
