import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './bio-link.service.js';

export const bioLinkRouter = Router({ mergeParams: true });
bioLinkRouter.use(gatewayContext, requireAuth, requireBusiness);

bioLinkRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    success(res, await svc.getBioLink(req.business!.id));
  }),
);

bioLinkRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    success(res, await svc.upsertBioLink(req.business!.id, req.body));
  }),
);

export const publicBioRouter = Router();

publicBioRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const html = await svc.getPublicBioHtml(req.params.slug);
    if (!html) {
      res.status(404).send('Not found');
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }),
);
