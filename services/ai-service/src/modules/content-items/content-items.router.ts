import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './content-items.service.js';

export const contentItemsRouter = Router({ mergeParams: true });
contentItemsRouter.use(gatewayContext, requireAuth, requireBusiness);

contentItemsRouter.get(
  '/calendar',
  asyncHandler(async (req, res) => {
    const from = (req.query.from as string) ?? new Date().toISOString();
    const to =
      (req.query.to as string) ??
      new Date(Date.now() + 90 * 86400000).toISOString();
    success(res, await svc.getCalendar(req.business!.id, from, to));
  }),
);

contentItemsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    success(
      res,
      await svc.listContentItems(req.business!.id, {
        status: req.query.status as string | undefined,
        marketingPlanId: req.query.marketingPlanId as string | undefined,
      }),
    );
  }),
);

contentItemsRouter.post(
  '/import',
  asyncHandler(async (req, res) => {
    const { csv } = req.body as { csv: string };
    success(res, await svc.importContentItemsFromCsv(req.business!.id, csv), 201);
  }),
);

contentItemsRouter.post(
  '/generate',
  asyncHandler(async (req, res) => {
    success(res, await svc.generateContentItem(req.business!.id, req.body), 201);
  }),
);

contentItemsRouter.get(
  '/:itemId/leads',
  asyncHandler(async (req, res) => {
    success(res, await svc.getContentItemLeads(req.business!.id, req.params.itemId));
  }),
);

contentItemsRouter.get(
  '/:itemId',
  asyncHandler(async (req, res) => {
    success(res, await svc.getContentItem(req.business!.id, req.params.itemId));
  }),
);

contentItemsRouter.patch(
  '/:itemId',
  asyncHandler(async (req, res) => {
    success(res, await svc.updateContentItem(req.business!.id, req.params.itemId, req.body));
  }),
);

contentItemsRouter.delete(
  '/:itemId',
  asyncHandler(async (req, res) => {
    await svc.deleteContentItem(req.business!.id, req.params.itemId);
    success(res, { deleted: true });
  }),
);
