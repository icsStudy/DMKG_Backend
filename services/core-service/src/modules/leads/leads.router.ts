import { Router } from 'express';
import { sendPaginated, success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import { parsePagination } from '../../middleware/parse-pagination.js';
import * as svc from './leads.service.js';

export const leadsRouter = Router();
leadsRouter.use(gatewayContext, requireAuth, requireBusiness, parsePagination);

leadsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { items, total } = await svc.listLeads(req.business!.id, {
      skip: req.pagination!.skip,
      limit: req.pagination!.limit,
      status: req.query.status as never,
      search: req.query.search as string | undefined,
    });
    sendPaginated(res, items, total, req.pagination!.page, req.pagination!.limit);
  }),
);

leadsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const lead = await svc.createLead(req.business!.id, req.userId, req.body);
    success(res, lead, 201);
  }),
);

leadsRouter.post(
  '/bulk',
  asyncHandler(async (req, res) => {
    const { leads } = req.body as { leads: never[] };
    const result = await svc.bulkImport(req.business!.id, req.userId, leads);
    success(res, result);
  }),
);

leadsRouter.get(
  '/:leadId',
  asyncHandler(async (req, res) => {
    const lead = await svc.getLead(req.business!.id, req.params.leadId);
    success(res, lead);
  }),
);

leadsRouter.put(
  '/:leadId',
  asyncHandler(async (req, res) => {
    const lead = await svc.updateLead(req.business!.id, req.params.leadId, req.body);
    success(res, lead);
  }),
);

leadsRouter.delete(
  '/:leadId',
  asyncHandler(async (req, res) => {
    await svc.softDeleteLead(req.business!.id, req.params.leadId);
    success(res, { deleted: true });
  }),
);

leadsRouter.get(
  '/:leadId/timeline',
  asyncHandler(async (req, res) => {
    const timeline = await svc.getTimeline(req.business!.id, req.params.leadId);
    success(res, timeline);
  }),
);

leadsRouter.post(
  '/:leadId/convert',
  asyncHandler(async (req, res) => {
    const lead = await svc.convertToCustomer(req.business!.id, req.params.leadId);
    success(res, lead);
  }),
);

export const contactRouter = Router();
contactRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const lead = await svc.handleContactForm(req.body);
    success(res, lead, 201);
  }),
);
