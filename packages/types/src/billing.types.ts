export type PlanId =
  | 'SOLO_BASIC'
  | 'SOLO_PRO'
  | 'AGENCY_BASIC'
  | 'AGENCY_PRO'
  | 'ENTERPRISE';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  businessLimit: number;
  features: string[];
  priceMonthly?: number;
  priceYearly?: number;
}
