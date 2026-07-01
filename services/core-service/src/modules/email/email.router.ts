import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './email.service.js';

export const emailRouter = Router();
emailRouter.use(gatewayContext, requireAuth, requireBusiness);

emailRouter.post(
  '/send',
  asyncHandler(async (req, res) => {
    const { to, subject, bodyHtml, leadId } = req.body;
    const event = await svc.sendEmail({
      businessId: req.business!.id,
      leadId,
      to,
      subject,
      bodyHtml,
    });
    success(res, event, 201);
  }),
);

emailRouter.post(
  '/bulk',
  asyncHandler(async (req, res) => {
    const { leadIds, subject, bodyHtml } = req.body;
    success(res, await svc.sendBulk(req.business!.id, leadIds, subject, bodyHtml));
  }),
);

emailRouter.post(
  '/track',
  asyncHandler(async (req, res) => {
    success(res, await svc.trackEvent(req.business!.id, req.body));
  }),
);

emailRouter.get(
  '/templates',
  asyncHandler(async (req, res) => {
    success(res, await svc.listTemplates(req.business!.id));
  }),
);

emailRouter.post(
  '/templates',
  asyncHandler(async (req, res) => {
    success(res, await svc.createTemplate(req.business!.id, req.body), 201);
  }),
);

emailRouter.put(
  '/templates/:templateId',
  asyncHandler(async (req, res) => {
    success(res, await svc.updateTemplate(req.business!.id, req.params.templateId, req.body));
  }),
);
