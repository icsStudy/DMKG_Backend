import type { Request, Response, RequestHandler } from 'express';
import { verifyToken } from '@spacode/utils';
import { config } from '../config.js';

function authError(res: Response, code: string, message: string): void {
  res.status(401).json({ success: false, error: { code, message } });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    authError(res, 'AUTH_REQUIRED', 'Authentication required');
    return;
  }

  try {
    const payload = verifyToken(token);
    req.headers['x-user-id'] = payload.sub;
    req.headers['x-org-id'] = payload.orgId;
    req.headers['x-system-role'] = payload.systemRole ?? payload.role;
    next();
  } catch {
    authError(res, 'AUTH_INVALID_TOKEN', 'Invalid or expired token');
  }
};

export const requireApiKey =
  (type: 'public' | 'admin'): RequestHandler =>
  (req, res, next) => {
    const key = req.headers['x-api-key'];
    const expected = type === 'public' ? config.PUBLIC_API_KEY : config.ADMIN_API_KEY;

    if (!key || key !== expected) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Valid API key required' },
      });
      return;
    }

    next();
  };

export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyToken(token);
    req.headers['x-user-id'] = payload.sub;
    req.headers['x-org-id'] = payload.orgId;
    req.headers['x-system-role'] = payload.systemRole ?? payload.role;
  } catch {
    // Continue without auth headers
  }

  next();
};

/** POST /api/v1/leads accepts JWT or public API key */
export const requireAuthOrPublicApiKey: RequestHandler = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === config.PUBLIC_API_KEY) {
    next();
    return;
  }

  requireAuth(req, res, next);
};

export function hasUserContext(req: Request): boolean {
  return Boolean(req.headers['x-user-id']);
}
