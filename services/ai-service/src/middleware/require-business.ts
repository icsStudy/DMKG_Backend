import type { NextFunction, Request, Response } from 'express';
import { prisma } from '@spacode/db';
import { Errors } from '@spacode/utils';

export async function requireBusiness(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const businessId =
    (req.headers['x-business-id'] as string) ||
    (req.query.businessId as string) ||
    req.params.id ||
    req.params.businessId;

  if (!businessId) return next(Errors.validation('x-business-id header required'));
  if (!req.orgId) return next(Errors.unauthorized());

  const business = await prisma.business.findFirst({
    where: { id: businessId, organizationId: req.orgId, deletedAt: null },
  });
  if (!business) return next(Errors.notFound('Business not found'));

  req.business = business;
  next();
}
