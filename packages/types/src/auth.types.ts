export interface JwtPayload {
  sub: string;
  orgId: string;
  role: string;
  systemRole?: string;
  iat: number;
  exp: number;
}

export interface InternalUserHeaders {
  'x-user-id': string;
  'x-org-id': string;
  'x-system-role': string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUserDto {
  id: string;
  email: string;
  systemRole: string;
  organizationId: string;
  membershipRole: string;
  planTier: string;
  twoFactorEnabled: boolean;
}
