import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './inbox.service.js';

export const inboxRouter = Router();
inboxRouter.use(gatewayContext, requireAuth, requireBusiness);

inboxRouter.get(
  '/messages',
  asyncHandler(async (req, res) => {
    success(
      res,
      await svc.listMessages(req.business!.id, {
        platform: req.query.platform as string | undefined,
        type: req.query.type as string | undefined,
      }),
    );
  }),
);

inboxRouter.post(
  '/messages/:id/reply',
  asyncHandler(async (req, res) => {
    const { reply } = req.body as { reply: string };
    success(res, await svc.replyToMessage(req.business!.id, req.params.id, reply));
  }),
);
