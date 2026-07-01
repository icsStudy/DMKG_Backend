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
import * as auth from './auth.service.js';

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
});
