import { Router } from 'express';
import express from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import * as svc from './billing.service.js';

export const billingRouter = Router();

billingRouter.get('/plans', (_req, res) => {
  success(res, svc.listPlans());
});

billingRouter.use(gatewayContext, requireAuth);

billingRouter.get(
  '/subscription',
  asyncHandler(async (req, res) => {
    success(res, await svc.getSubscription(req.orgId!));
  }),
);

billingRouter.post(
  '/portal',
  asyncHandler(async (req, res) => {
    success(res, await svc.createBillingPortal(req.orgId!));
  }),
);

export const stripeWebhookRouter = Router();
stripeWebhookRouter.post(
  '/',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    await svc.handleStripeWebhook(req.body as Buffer, sig);
    success(res, { received: true });
  }),
);
