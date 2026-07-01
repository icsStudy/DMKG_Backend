import type { Request, Response, NextFunction } from 'express';
import type { PaginatedResponse } from '@spacode/types';
import { AppError } from './errors.js';
import { logger } from './logger.js';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

export const success = sendSuccess;

export function sendFail(res: Response, err: AppError): void {
  res.status(err.statusCode).json({
    success: false,
    error: { code: err.code, message: err.message, details: err.details },
  });
}

export const fail = sendFail;

export function sendPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
): void {
  const payload: PaginatedResponse<T> = {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 0,
  };
  res.status(200).json({ success: true, data: payload });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
}
