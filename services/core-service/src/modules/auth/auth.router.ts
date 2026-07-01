import { Router } from 'express';
import type { PlanId } from '@spacode/db';
import { success } from '@spacode/utils';
import { asyncHandler } from '../../middleware/error-handler.js';
import { gatewayContext, requireAuth as authMw } from '../../middleware/gateway-context.js';
import * as authService from './auth.service.js';

export const authRouter = Router();

authRouter.use(gatewayContext);

authRouter.post(
  '/request-code',
  asyncHandler(async (req, res) => {
    const { email, planTier } = req.body as { email: string; planTier?: string };
    await authService.requestOtp(email, planTier as never);
    success(res, { sent: true });
  }),
);

authRouter.post(
  '/verify-code',
  asyncHandler(async (req, res) => {
    const { email, code } = req.body as { email: string; code: string };
    const result = await authService.verifyOtp(email, code);
    success(res, result);
  }),
);

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, code, planId, trial } = req.body as {
      email: string;
      code: string;
      planId: PlanId;
      trial?: boolean;
    };
    const result = await authService.register(email, code, planId, trial);
    success(res, result.tokens);
  }),
);

authRouter.post(
  '/google',
  asyncHandler(async (req, res) => {
    const { idToken, planTier } = req.body as { idToken: string; planTier?: string };
    const result = await authService.verifyGoogle(idToken, planTier as never);
    success(res, result);
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const result = await authService.refreshAccessToken(refreshToken);
    success(res, result);
  }),
);

authRouter.post(
  '/invite',
  authMw,
  asyncHandler(async (req, res) => {
    const { email, role } = req.body as { email: string; role?: string };
    const invite = await authService.createInvite(req.orgId!, req.userId!, email, role);
    success(res, invite, 201);
  }),
);

authRouter.post(
  '/accept-invite',
  asyncHandler(async (req, res) => {
    const { token, email, code } = req.body as { token: string; email: string; code: string };
    const result = await authService.acceptInvite(token, email, code);
    success(res, result);
  }),
);

export const profile2faRouter = Router();
profile2faRouter.use(gatewayContext, authMw);

profile2faRouter.post(
  '/setup',
  asyncHandler(async (req, res) => {
    const data = await authService.setup2FA(req.userId!);
    success(res, data);
  }),
);

profile2faRouter.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const { code } = req.body as { code: string };
    await authService.verify2FA(req.userId!, code);
    success(res, { enabled: true });
  }),
);
