import { PlanId } from '@spacode/db';

export type PlanTier = PlanId;

export const BUSINESS_LIMITS: Record<PlanId, number> = {
  SOLO_BASIC: 1,
  SOLO_PRO: 3,
  AGENCY_BASIC: 10,
  AGENCY_PRO: 50,
  ENTERPRISE: 9999,
};

export const PLANS: Array<{
  tier: PlanId;
  name: string;
  businessLimit: number;
  priceMonthly: number | null;
  features: string[];
}> = [
  {
    tier: 'SOLO_BASIC',
    name: 'Solo Basic',
    businessLimit: 1,
    priceMonthly: 49,
    features: ['1 business', 'CRM', 'Email'],
  },
  {
    tier: 'SOLO_PRO',
    name: 'Solo Pro',
    businessLimit: 3,
    priceMonthly: 99,
    features: ['3 businesses', 'AI marketing', 'Social publish'],
  },
  {
    tier: 'AGENCY_BASIC',
    name: 'Agency Basic',
    businessLimit: 10,
    priceMonthly: 199,
    features: ['10 businesses', 'Team invites', 'Analytics'],
  },
  {
    tier: 'AGENCY_PRO',
    name: 'Agency Pro',
    businessLimit: 50,
    priceMonthly: 399,
    features: ['50 businesses', 'SEO audits', 'Priority support'],
  },
  {
    tier: 'ENTERPRISE',
    name: 'Enterprise',
    businessLimit: 9999,
    priceMonthly: null,
    features: ['Unlimited businesses', 'Custom integrations', 'SLA'],
  },
];
