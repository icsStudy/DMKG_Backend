export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  BUSINESS_LIMIT_EXCEEDED: 'BUSINESS_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PLAN_REQUIRED: 'PLAN_REQUIRED',
} as const;

export const notFound = (msg = 'Not found') => new AppError(msg, ErrorCodes.NOT_FOUND, 404);

export const unauthorized = (msg = 'Unauthorized') =>
  new AppError(msg, ErrorCodes.AUTH_REQUIRED, 401);

export const forbidden = (msg = 'Forbidden') => new AppError(msg, ErrorCodes.FORBIDDEN, 403);

export const badRequest = (msg: string, details?: unknown[]) =>
  new AppError(msg, ErrorCodes.VALIDATION_ERROR, 400, details);

export const conflict = (msg: string) => new AppError(msg, ErrorCodes.CONFLICT, 409);

export const internalError = (msg = 'Internal server error') =>
  new AppError(msg, ErrorCodes.INTERNAL_ERROR, 500);

export const Errors = {
  notFound,
  unauthorized,
  forbidden,
  validation: badRequest,
  conflict,
  internal: internalError,
};
