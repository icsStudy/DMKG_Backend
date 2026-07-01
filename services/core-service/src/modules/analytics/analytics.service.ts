import { LeadStatus, prisma } from '@spacode/db';

export async function getOverview(businessId: string) {
  const [totalLeads, converted, newLeads] = await Promise.all([
    prisma.lead.count({ where: { businessId, deletedAt: null } }),
    prisma.lead.count({
      where: { businessId, deletedAt: null, status: LeadStatus.CONVERTED },
    }),
    prisma.lead.count({
      where: { businessId, deletedAt: null, status: LeadStatus.NEW },
    }),
  ]);

  const conversionRate = totalLeads > 0 ? converted / totalLeads : 0;

  return {
    totalLeads,
    newLeads,
    converted,
    conversionRate: Math.round(conversionRate * 1000) / 10,
    avgScore: 0,
  };
}

export async function getFunnel(businessId: string) {
  const statuses = Object.values(LeadStatus);
  const counts = await Promise.all(
    statuses.map((status) =>
      prisma.lead.count({ where: { businessId, deletedAt: null, status } }),
    ),
  );
  return statuses.map((status, i) => ({ status, count: counts[i] }));
}

export async function getTrends(businessId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const leads = await prisma.lead.findMany({
    where: { businessId, deletedAt: null, createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const byDay: Record<string, number> = {};
  for (const lead of leads) {
    const key = lead.createdAt.toISOString().slice(0, 10);
    byDay[key] = (byDay[key] ?? 0) + 1;
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export async function exportAnalytics(businessId: string) {
  const [overview, funnel, trends] = await Promise.all([
    getOverview(businessId),
    getFunnel(businessId),
    getTrends(businessId),
  ]);
  return { overview, funnel, trends };
}
