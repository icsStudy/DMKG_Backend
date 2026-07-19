import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import * as svc from './webhooks.service.js';

export const webhooksMgmtRouter = Router();
webhooksMgmtRouter.use(gatewayContext, requireAuth);

webhooksMgmtRouter.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const businessId = req.headers['x-business-id'] as string | undefined;
    success(res, await svc.listWebhookLogs(businessId));
  }),
);

webhooksMgmtRouter.post(
  '/retry/:id',
  asyncHandler(async (req, res) => {
    success(res, await svc.retryWebhook(req.params.id));
  }),
);

export const webhooksPublicRouter = Router();

webhooksPublicRouter.get(
  '/meta/leadgen',
  asyncHandler(async (req, res) => {
    const challenge = svc.verifyMetaChallenge(
      req.query['hub.mode'] as string,
      req.query['hub.verify_token'] as string,
      req.query['hub.challenge'] as string,
    );
    res.send(challenge);
  }),
);

webhooksPublicRouter.post(
  '/meta/leadgen',
  asyncHandler(async (req, res) => {
    success(res, await svc.handleMetaLeadgen(req.body));
  }),
);

webhooksPublicRouter.get(
  '/meta/whatsapp',
  asyncHandler(async (req, res) => {
    const challenge = svc.verifyWhatsAppChallenge(
      req.query['hub.mode'] as string,
      req.query['hub.verify_token'] as string,
      req.query['hub.challenge'] as string,
    );
    res.send(challenge);
  }),
);

webhooksPublicRouter.post(
  '/meta/whatsapp',
  asyncHandler(async (req, res) => {
    if (req.body?.entry?.[0]?.changes?.[0]?.field === 'message_template_status_update') {
      success(res, await svc.handleTemplateStatusUpdate(req.body));
      return;
    }
    success(res, await svc.handleWhatsAppWebhook(req.body));
  }),
);

webhooksPublicRouter.post(
  '/inbound/:businessId',
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-spacode-signature'] as string | undefined;
    success(res, await svc.handleInboundWebhook(req.params.businessId, req.body, signature));
  }),
);

webhooksPublicRouter.get(
  '/tiktok/leadgen',
  asyncHandler(async (req, res) => {
    const challenge = svc.verifyTikTokChallenge(
      req.query['hub.mode'] as string,
      req.query['hub.verify_token'] as string,
      req.query['hub.challenge'] as string,
    );
    res.send(challenge);
  }),
);

webhooksPublicRouter.post(
  '/tiktok/leadgen',
  asyncHandler(async (req, res) => {
    success(res, await svc.handleTikTokLeadgen(req.body));
  }),
);

webhooksPublicRouter.post(
  '/linkedin/leadgen',
  asyncHandler(async (req, res) => {
    success(res, await svc.handleLinkedInLeadgen(req.body));
  }),
);

webhooksPublicRouter.post(
  '/meta/comments',
  asyncHandler(async (req, res) => {
    success(res, await svc.handleMetaComment(req.body));
  }),
);
