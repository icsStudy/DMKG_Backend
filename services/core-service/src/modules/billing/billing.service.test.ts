import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionStatus } from '@spacode/db';

vi.mock('@spacode/db', () => ({
  SubscriptionStatus: {
    ACTIVE: 'ACTIVE',
    TRIALING: 'TRIALING',
    PAST_DUE: 'PAST_DUE',
    CANCELED: 'CANCELED',
    UNPAID: 'UNPAID',
  },
  prisma: {
    subscription: { findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../../lib/stripe.js', () => ({
  getStripe: vi.fn(),
}));

vi.mock('../../config.js', () => ({
  getConfig: () => ({ FRONTEND_URL: 'http://localhost:3060', STRIPE_WEBHOOK_SECRET: 'whsec_test' }),
}));

vi.mock('@spacode/utils', () => ({
  Errors: {
    notFound: (msg: string) => new Error(msg),
    internal: (msg: string) => new Error(msg),
  },
}));

import { prisma } from '@spacode/db';
import { getStripe } from '../../lib/stripe.js';
import * as billing from '../billing.service.js';

describe('billing.service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getSubscription returns plan and status', async () => {
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: 'sub-1',
      status: SubscriptionStatus.TRIALING,
      planId: 'SOLO_BASIC',
      trialEndsAt: new Date('2026-01-01'),
      currentPeriodEnd: null,
    } as never);

    const sub = await billing.getSubscription('org-1');
    expect(sub.planTier).toBe('SOLO_BASIC');
    expect(sub.status).toBe(SubscriptionStatus.TRIALING);
  });

  it('listPlans returns configured plans', () => {
    const plans = billing.listPlans();
    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0]).toHaveProperty('tier');
  });

  it('createBillingPortal requires stripe', async () => {
    vi.mocked(getStripe).mockReturnValue(null as never);
    await expect(billing.createBillingPortal('org-1')).rejects.toThrow('Stripe not configured');
  });
});
