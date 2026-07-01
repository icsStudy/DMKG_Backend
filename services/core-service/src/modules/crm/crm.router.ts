import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './crm.service.js';

export const crmRouter = Router();
crmRouter.use(gatewayContext, requireAuth, requireBusiness);

crmRouter.get(
  '/adapters',
  asyncHandler(async (_req, res) => {
    success(res, { adapters: svc.CRM_ADAPTERS });
  }),
);

crmRouter.get(
  '/connections',
  asyncHandler(async (req, res) => {
    success(res, await svc.listConnections(req.business!.id));
  }),
);

crmRouter.post(
  '/connections/:adapter',
  asyncHandler(async (req, res) => {
    const { accessToken } = req.body as { accessToken?: string };
    if (!accessToken) throw new Error('accessToken required');
    success(
      res,
      await svc.connectAdapter(req.business!.id, req.params.adapter, accessToken),
      201,
    );
  }),
);

crmRouter.delete(
  '/connections/:adapter',
  asyncHandler(async (req, res) => {
    await svc.disconnectAdapter(req.business!.id, req.params.adapter);
    success(res, { ok: true });
  }),
);

crmRouter.post(
  '/sync/:adapter',
  asyncHandler(async (req, res) => {
    success(res, await svc.syncLeads(req.business!.id, req.params.adapter));
  }),
);
