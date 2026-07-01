import { prisma, SubscriptionStatus } from '@spacode/db';
import { Errors } from '@spacode/utils';
import { getConfig } from '../../config.js';
import { PLANS } from '../../lib/plan-limits.js';
import { getStripe } from '../../lib/stripe.js';

export function listPlans() {
  return PLANS;
}

export async function getSubscription(orgId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { organizationId: orgId },
  });
  if (!sub) throw Errors.notFound('Subscription not found');
  return {
    id: sub.id,
    status: sub.status,
    planTier: sub.planId,
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
  };
}

export async function createBillingPortal(orgId: string): Promise<{ url: string }> {
  const stripe = getStripe();
  if (!stripe) throw Errors.internal('Stripe not configured');

  const sub = await prisma.subscription.findFirst({ where: { organizationId: orgId } });
  if (!sub) throw Errors.notFound('Subscription not found');

  let customerId = sub.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { organizationId: orgId },
    });
    customerId = customer.id;
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getConfig().FRONTEND_URL}/billing`,
  });

  return { url: session.url };
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
  const stripe = getStripe();
  const secret = getConfig().STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) throw Errors.internal('Stripe webhook not configured');

  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as {
        id: string;
        status: string;
        metadata?: { organizationId?: string };
      };
      const orgId = sub.metadata?.organizationId;
      if (!orgId) break;
      const statusMap: Record<string, SubscriptionStatus> = {
        active: SubscriptionStatus.ACTIVE,
        trialing: SubscriptionStatus.TRIALING,
        past_due: SubscriptionStatus.PAST_DUE,
        canceled: SubscriptionStatus.CANCELED,
        unpaid: SubscriptionStatus.UNPAID,
      };
      await prisma.subscription.updateMany({
        where: { organizationId: orgId },
        data: {
          stripeSubscriptionId: sub.id,
          status: statusMap[sub.status] ?? SubscriptionStatus.ACTIVE,
        },
      });
      break;
    }
    default:
      break;
  }
}
