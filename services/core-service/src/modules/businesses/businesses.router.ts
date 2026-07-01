import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './businesses.service.js';

export const businessesRouter = Router();
businessesRouter.use(gatewayContext, requireAuth);

businessesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const list = await svc.listBusinesses(req.orgId!);
    success(res, list);
  }),
);

businessesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const business = await svc.createBusiness(req.orgId!, req.body);
    success(res, business, 201);
  }),
);

businessesRouter.get(
  '/:businessId',
  asyncHandler(async (req, res) => {
    const business = await svc.getBusiness(req.orgId!, req.params.businessId);
    success(res, business);
  }),
);

businessesRouter.put(
  '/:businessId',
  asyncHandler(async (req, res) => {
    const business = await svc.updateBusiness(req.orgId!, req.params.businessId, req.body);
    success(res, business);
  }),
);

businessesRouter.delete(
  '/:businessId',
  asyncHandler(async (req, res) => {
    await svc.deleteBusiness(req.orgId!, req.params.businessId);
    success(res, { deleted: true });
  }),
);

businessesRouter.get(
  '/:businessId/profile',
  requireBusiness,
  asyncHandler(async (req, res) => {
    success(res, req.business);
  }),
);

businessesRouter.put(
  '/:businessId/profile',
  requireBusiness,
  asyncHandler(async (req, res) => {
    const updated = await svc.updateProfile(req.business!.id, req.body);
    success(res, updated);
  }),
);
