import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './connections.service.js';

export const connectionsRouter = Router();
connectionsRouter.use(gatewayContext, requireAuth, requireBusiness);

connectionsRouter.get(
  '/connections',
  asyncHandler(async (req, res) => {
    success(res, await svc.listConnections(req.business!.id));
  }),
);

connectionsRouter.get(
  '/connect/meta',
  asyncHandler(async (req, res) => {
    success(res, { url: svc.getMetaConnectUrl(req.business!.id) });
  }),
);

connectionsRouter.get(
  '/connect/whatsapp',
  asyncHandler(async (req, res) => {
    success(res, { url: svc.getWhatsAppConnectUrl(req.business!.id) });
  }),
);

connectionsRouter.delete(
  '/connections/:platform',
  asyncHandler(async (req, res) => {
    await svc.deleteConnection(req.business!.id, req.params.platform);
    success(res, { deleted: true });
  }),
);

connectionsRouter.get(
  '/whatsapp/profile',
  asyncHandler(async (req, res) => {
    success(res, await svc.getWhatsAppProfile(req.business!.id));
  }),
);

export const callbackRouter = Router();

callbackRouter.get(
  '/meta',
  asyncHandler(async (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const redirect = await svc.handleMetaCallback(code, state);
    res.redirect(redirect);
  }),
);

callbackRouter.get(
  '/whatsapp',
  asyncHandler(async (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const redirect = await svc.handleWhatsAppCallback(code, state);
    res.redirect(redirect);
  }),
);
