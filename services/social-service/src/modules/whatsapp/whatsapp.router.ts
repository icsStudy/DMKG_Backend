import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './whatsapp.service.js';

export const whatsappRouter = Router({ mergeParams: true });
whatsappRouter.use(gatewayContext, requireAuth, requireBusiness);

whatsappRouter.get(
  '/templates',
  asyncHandler(async (req, res) => {
    success(res, await svc.listTemplates(req.business!.id));
  }),
);

whatsappRouter.post(
  '/templates',
  asyncHandler(async (req, res) => {
    success(res, await svc.submitTemplate(req.business!.id, req.body), 201);
  }),
);

whatsappRouter.get(
  '/templates/:templateId/status',
  asyncHandler(async (req, res) => {
    success(res, await svc.getTemplateStatus(req.business!.id, req.params.templateId));
  }),
);

whatsappRouter.post(
  '/send',
  asyncHandler(async (req, res) => {
    success(res, await svc.sendTemplateMessage(req.business!.id, req.body));
  }),
);
