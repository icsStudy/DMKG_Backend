import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('@spacode/db', () => ({
  prisma: {
    business: { findFirst: vi.fn() },
  },
}));

vi.mock('@spacode/utils', () => ({
  Errors: {
    validation: (msg: string) => Object.assign(new Error(msg), { statusCode: 400 }),
    unauthorized: () => Object.assign(new Error('Unauthorized'), { statusCode: 401 }),
    notFound: (msg: string) => Object.assign(new Error(msg), { statusCode: 404 }),
  },
}));

import { prisma } from '@spacode/db';
import { requireBusiness } from './require-business.js';

describe('requireBusiness middleware', () => {
  const next = vi.fn() as NextFunction;
  const res = {} as Response;

  beforeEach(() => vi.clearAllMocks());

  it('rejects when x-business-id missing', async () => {
    const req = { headers: {}, orgId: 'org-1' } as Request;
    await requireBusiness(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('rejects when orgId missing', async () => {
    const req = { headers: { 'x-business-id': 'biz-1' } } as unknown as Request;
    await requireBusiness(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('sets req.business when valid', async () => {
    const business = { id: 'biz-1', organizationId: 'org-1', name: 'Test' };
    vi.mocked(prisma.business.findFirst).mockResolvedValue(business as never);
    const req = {
      headers: { 'x-business-id': 'biz-1' },
      orgId: 'org-1',
    } as Request;

    await requireBusiness(req, res, next);
    expect(req.business).toEqual(business);
    expect(next).toHaveBeenCalledWith();
  });
});
