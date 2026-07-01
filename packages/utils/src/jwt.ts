import jwt, { type SignOptions } from 'jsonwebtoken';
import type { JwtPayload } from '@spacode/types';
import { AppError, ErrorCodes } from './errors.js';

const privateKey = () => process.env.JWT_PRIVATE_KEY!.replace(/\\n/g, '\n');
const publicKey = () => process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n');

const accessExpires = (): SignOptions['expiresIn'] =>
  (process.env.JWT_ACCESS_EXPIRES ?? '15m') as SignOptions['expiresIn'];

const refreshExpires = (): SignOptions['expiresIn'] =>
  (process.env.JWT_REFRESH_EXPIRES ?? '14d') as SignOptions['expiresIn'];

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, privateKey(), {
    algorithm: 'RS256',
    expiresIn: accessExpires(),
  });
}

export function signRefreshToken(userId: string, _jti?: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, privateKey(), {
    algorithm: 'RS256',
    expiresIn: refreshExpires(),
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, publicKey(), { algorithms: ['RS256'] });
    if (typeof decoded === 'string' || !decoded.sub) {
      throw new Error('Invalid token payload');
    }
    return decoded as JwtPayload;
  } catch {
    throw new AppError('Invalid or expired token', ErrorCodes.AUTH_INVALID_TOKEN, 401);
  }
}

export function verifyRefreshToken(token: string): { sub: string } {
  try {
    const decoded = jwt.verify(token, publicKey(), { algorithms: ['RS256'] }) as jwt.JwtPayload;
    if (typeof decoded === 'string' || !decoded.sub || decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }
    return { sub: decoded.sub };
  } catch {
    throw new AppError('Invalid or expired refresh token', ErrorCodes.AUTH_INVALID_TOKEN, 401);
  }
}

export function decodeGatewayContext(headers: Record<string, string | string[] | undefined>): {
  userId?: string;
  orgId?: string;
  systemRole?: string;
} {
  const userId = headers['x-user-id'];
  const orgId = headers['x-org-id'];
  const systemRole = headers['x-system-role'];
  return {
    userId: typeof userId === 'string' ? userId : undefined,
    orgId: typeof orgId === 'string' ? orgId : undefined,
    systemRole: typeof systemRole === 'string' ? systemRole : undefined,
  };
}
