import { PlanId, prisma } from '@spacode/db';
import { Errors } from '@spacode/utils';
import { BUSINESS_LIMITS } from '../../lib/plan-limits.js';

function mapBusinessInput(data: {
  name?: string;
  industry?: string;
  description?: string;
  websiteUrl?: string;
  logoUrl?: string;
}) {
  const { industry, websiteUrl, ...rest } = data;
  return {
    ...rest,
    ...(industry !== undefined && { type: industry }),
    ...(websiteUrl !== undefined && { website: websiteUrl }),
  };
}

export async function listBusinesses(orgId: string) {
  return prisma.business.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBusiness(orgId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, organizationId: orgId, deletedAt: null },
  });
  if (!business) throw Errors.notFound('Business not found');
  return business;
}

export async function createBusiness(
  orgId: string,
  data: { name: string; industry?: string; description?: string; websiteUrl?: string },
) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { subscription: true },
  });
  if (!org) throw Errors.notFound('Organization not found');

  const count = await prisma.business.count({
    where: { organizationId: orgId, deletedAt: null },
  });
  const planId = org.subscription?.planId ?? PlanId.SOLO_BASIC;
  const limit = BUSINESS_LIMITS[planId];
  if (count >= limit) {
    throw Errors.forbidden(`Plan limit reached (${limit} businesses)`);
  }

  return prisma.business.create({
    data: {
      organizationId: orgId,
      ...mapBusinessInput(data),
      name: data.name,
    },
  });
}

export async function updateBusiness(
  orgId: string,
  businessId: string,
  data: Partial<{
    name: string;
    industry: string;
    description: string;
    websiteUrl: string;
    logoUrl: string;
  }>,
) {
  await getBusiness(orgId, businessId);
  return prisma.business.update({
    where: { id: businessId },
    data: mapBusinessInput(data),
  });
}

export async function deleteBusiness(orgId: string, businessId: string) {
  await getBusiness(orgId, businessId);
  return prisma.business.update({
    where: { id: businessId },
    data: { deletedAt: new Date() },
  });
}

export async function getProfile(businessId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw Errors.notFound('Business not found');
  return business;
}

export async function updateProfile(
  businessId: string,
  data: Partial<{
    name: string;
    industry: string;
    description: string;
    websiteUrl: string;
    logoUrl: string;
  }>,
) {
  return prisma.business.update({
    where: { id: businessId },
    data: mapBusinessInput(data),
  });
}

export { encrypt, decrypt } from '@spacode/utils';
