import type { NextFunction, Request, Response } from 'express';
import { SystemRole, prisma } from '@spacode/db';
import { decodeGatewayContext, Errors } from '@spacode/utils';

export async function gatewayContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId, orgId, systemRole } = decodeGatewayContext(req.headers);
  if (userId) req.userId = userId;
  if (orgId) req.orgId = orgId;
  if (systemRole) req.systemRole = systemRole as SystemRole;

  if (userId && orgId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (membership) req.membershipRole = membership.role;
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId || !req.orgId) return next(Errors.unauthorized());
  next();
}
