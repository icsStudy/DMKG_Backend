import type { NextFunction, Request, Response } from 'express';
import { SystemRole } from '@spacode/db';
import { Errors } from '@spacode/utils';

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.systemRole !== SystemRole.SUPERADMIN) {
    return next(Errors.forbidden('Super admin required'));
  }
  next();
}
