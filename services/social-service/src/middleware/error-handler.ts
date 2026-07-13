import type { NextFunction, Request, Response } from 'express';
import { AppError, fail, logger } from '@spacode/utils';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    fail(res, err);
    return;
  }
  logger.error({ err }, 'Unhandled error');
  fail(res, new AppError('INTERNAL', 'Internal server error', 500));
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
