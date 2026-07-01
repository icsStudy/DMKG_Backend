import type { NextFunction, Request, Response } from 'express';

export function parsePagination(req: Request, _res: Response, next: NextFunction): void {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  req.pagination = { page, limit, skip: (page - 1) * limit };
  next();
}
