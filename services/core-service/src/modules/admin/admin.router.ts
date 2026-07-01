import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireSuperAdmin } from '../../middleware/require-super-admin.js';
import * as svc from './admin.service.js';

export const adminRouter = Router();
adminRouter.use(gatewayContext, requireAuth, requireSuperAdmin);

adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await svc.getStats() });
  }),
);

adminRouter.get(
  '/users/export',
  asyncHandler(async (_req, res) => {
    const csv = await svc.exportUsersCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  }),
);

adminRouter.get(
  '/leads/:businessId/export',
  asyncHandler(async (req, res) => {
    const csv = await svc.exportLeadsCsv(req.params.businessId);
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  }),
);
