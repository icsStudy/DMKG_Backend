import Stripe from 'stripe';
import { getConfig } from '../config.js';

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = getConfig().STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripe) stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
  return stripe;
}
