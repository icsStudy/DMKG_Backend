import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlanId, SubscriptionStatus } from '@spacode/db';

vi.mock('@spacode/db', () => ({
  PlanId: { SOLO_BASIC: 'SOLO_BASIC', SOLO_PRO: 'SOLO_PRO' },
  MembershipRole: { OWNER: 'owner', MEMBER: 'member' },
  SubscriptionStatus: { TRIALING: 'TRIALING', ACTIVE: 'ACTIVE' },
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    membership: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    organization: { create: vi.fn() },
    userProfile: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    subscription: { create: vi.fn(), findFirst: vi.fn() },
    refreshToken: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    teamInvite: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
      fn({
        organization: { create: vi.fn().mockResolvedValue({ id: 'org-1' }) },
        membership: { create: vi.fn() },
        userProfile: { create: vi.fn() },
        subscription: { create: vi.fn() },
      }),
    ),
  },
}));

vi.mock('../../lib/redis.js', () => ({
  OTP_PREFIX: 'otp:',
  OTP_TTL_SEC: 300,
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(JSON.stringify({ code: '123456', planTier: PlanId.SOLO_BASIC })),
    setex: vi.fn(),
    del: vi.fn(),
  }),
}));

const verifyIdToken = vi.fn();

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken,
  })),
}));

vi.mock('../../config.js', () => ({
  getConfig: vi.fn(() => ({ GOOGLE_CLIENT_ID: 'test-google-client-id' })),
}));

vi.mock('@spacode/utils', () => ({
  encrypt: (v: string) => v,
  decrypt: (v: string) => v,
  hashToken: (v: string) => v,
  signAccessToken: () => 'access-token',
  signRefreshToken: () => 'refresh-token',
  verifyRefreshToken: () => ({ sub: 'user-1' }),
  Errors: {
    unauthorized: (msg: string) => new Error(msg),
    internal: (msg: string) => new Error(msg),
    notFound: (msg: string) => new Error(msg),
    validation: (msg: string) => new Error(msg),
  },
}));

import { prisma } from '@spacode/db';
import { getConfig } from '../../config.js';
import * as auth from './auth.service.js';

function mockGooglePayload(email = 'google@example.com', sub = 'google-sub-123') {
  verifyIdToken.mockResolvedValue({
    getPayload: () => ({ email, sub }),
  });
}

function mockIssueTokens(email: string, planId = PlanId.SOLO_BASIC) {
  vi.mocked(prisma.membership.findFirst)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({
      organizationId: 'org-1',
      role: 'owner',
      user: { id: 'user-1', email, systemRole: 'USER', profile: null },
      organization: { subscription: { planId } },
    } as never);
  vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);
}

describe('auth.service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verifyOtp creates user and returns tokens for new email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'user-1', email: 'a@b.com' } as never);
    vi.mocked(prisma.membership.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        organizationId: 'org-1',
        role: 'owner',
        user: { id: 'user-1', email: 'a@b.com', systemRole: 'USER', profile: null },
        organization: { subscription: { planId: PlanId.SOLO_BASIC } },
      } as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);

    const result = await auth.verifyOtp('a@b.com', '123456');
    expect(result.tokens.accessToken).toBe('access-token');
    expect(result.user.email).toBe('a@b.com');
  });

  it('register creates user with plan and returns tokens', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'user-1', email: 'new@b.com' } as never);
    vi.mocked(prisma.membership.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        organizationId: 'org-1',
        role: 'owner',
        user: { id: 'user-1', email: 'new@b.com', systemRole: 'USER', profile: null },
        organization: { subscription: { planId: PlanId.SOLO_PRO } },
      } as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);

    const result = await auth.register('new@b.com', '123456', PlanId.SOLO_PRO, true);
    expect(result.tokens.accessToken).toBe('access-token');
    expect(result.user.email).toBe('new@b.com');
  });

  it('requestOtp stores code in redis', async () => {
    await expect(auth.requestOtp('test@example.com')).resolves.toBeUndefined();
  });

  it('verifyGoogle creates user and returns tokens for new Google account', async () => {
    mockGooglePayload();
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-1',
      email: 'google@example.com',
      googleSub: 'google-sub-123',
    } as never);
    mockIssueTokens('google@example.com', PlanId.SOLO_PRO);

    const result = await auth.verifyGoogle('valid-id-token', PlanId.SOLO_PRO);
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'valid-id-token',
      audience: 'test-google-client-id',
    });
    expect(result.tokens.accessToken).toBe('access-token');
    expect(result.user.email).toBe('google@example.com');
  });

  it('verifyGoogle links googleSub to existing OTP user', async () => {
    mockGooglePayload();
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'user-1',
      email: 'google@example.com',
      googleSub: null,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'user-1',
      email: 'google@example.com',
      googleSub: 'google-sub-123',
    } as never);
    vi.mocked(prisma.membership.findFirst).mockResolvedValueOnce({
      organizationId: 'org-1',
      role: 'owner',
      user: { id: 'user-1', email: 'google@example.com', systemRole: 'USER', profile: null },
      organization: { subscription: { planId: PlanId.SOLO_BASIC } },
    } as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);

    const result = await auth.verifyGoogle('valid-id-token');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { googleSub: 'google-sub-123' },
    });
    expect(result.tokens.accessToken).toBe('access-token');
  });

  it('verifyGoogle throws when Google OAuth is not configured', async () => {
    vi.mocked(getConfig).mockReturnValueOnce({ GOOGLE_CLIENT_ID: '' } as never);
    await expect(auth.verifyGoogle('valid-id-token')).rejects.toThrow('Google OAuth not configured');
  });

  it('verifyGoogle rejects token without email', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'google-sub-123' }),
    });
    await expect(auth.verifyGoogle('invalid-id-token')).rejects.toThrow('Invalid Google token');
  });
});
