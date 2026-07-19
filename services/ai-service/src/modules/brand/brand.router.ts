import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './brand.service.js';

export const brandRouter = Router({ mergeParams: true });
brandRouter.use(gatewayContext, requireAuth, requireBusiness);

brandRouter.post(
  '/import-from-url',
  asyncHandler(async (req, res) => {
    const { url } = req.body as { url: string };
    success(res, await svc.importBrandFromUrl(req.business!.id, url));
  }),
);
