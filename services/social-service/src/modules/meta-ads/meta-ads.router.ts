import { Router } from 'express';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth } from '../../middleware/gateway-context.js';
import { requireBusiness } from '../../middleware/require-business.js';
import * as svc from './meta-ads.service.js';

export const metaAdsRouter = Router({ mergeParams: true });
metaAdsRouter.use(gatewayContext, requireAuth, requireBusiness);

metaAdsRouter.get(
  '/ad-accounts',
  asyncHandler(async (req, res) => {
    success(res, await svc.listAdAccounts(req.business!.id));
  }),
);

metaAdsRouter.get(
  '/campaigns',
  asyncHandler(async (req, res) => {
    success(res, await svc.listCampaigns(req.business!.id));
  }),
);

metaAdsRouter.post(
  '/campaigns',
  asyncHandler(async (req, res) => {
    success(res, await svc.createCampaign(req.business!.id, req.body), 201);
  }),
);

metaAdsRouter.post(
  '/campaigns/:campaignId/activate',
  asyncHandler(async (req, res) => {
    success(res, await svc.activateCampaign(req.business!.id, req.params.campaignId));
  }),
);

metaAdsRouter.post(
  '/campaigns/:campaignId/pause',
  asyncHandler(async (req, res) => {
    success(res, await svc.pauseCampaign(req.business!.id, req.params.campaignId));
  }),
);

metaAdsRouter.get(
  '/campaigns/:campaignId/insights',
  asyncHandler(async (req, res) => {
    success(res, await svc.getCampaignInsights(req.business!.id, req.params.campaignId));
  }),
);
