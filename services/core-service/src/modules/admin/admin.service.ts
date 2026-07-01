import { prisma, SubscriptionStatus } from '@spacode/db';
import { decrypt } from '@spacode/utils';

export async function getStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [organizations, businesses, users, activeSubscriptions, signupsLast30d] = await Promise.all([
    prisma.organization.count(),
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.user.count(),
    prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  return {
    organizations,
    users,
    businesses,
    activeSubscriptions,
    signupsLast30d,
  };
}

export async function exportUsersCsv(): Promise<string> {
  const users = await prisma.user.findMany({ include: { profile: true } });
  const header = 'id,email,displayName,createdAt\n';
  const rows = users
    .map(
      (u) =>
        `${u.id},${u.email},${u.profile?.displayName ?? ''},${u.createdAt.toISOString()}`,
    )
    .join('\n');
  return header + rows;
}

export async function exportLeadsCsv(businessId: string): Promise<string> {
  const leads = await prisma.lead.findMany({
    where: { businessId, deletedAt: null },
  });
  const header = 'id,email,name,status,score,createdAt\n';
  const rows = leads
    .map((l) => {
      let email = '';
      if (l.contactEmail) {
        try {
          email = decrypt(l.contactEmail);
        } catch {
          email = l.contactEmail;
        }
      }
      const name = [l.contactFirstName, l.contactLastName].filter(Boolean).join(' ');
      return `${l.id},${email},${name},${l.status},${l.leadScore},${l.createdAt.toISOString()}`;
    })
    .join('\n');
  return header + rows;
}
