import { MarketingAutomationRunStatus, prisma } from '@spacode/db';
import type { GenerateContentPlanDto, MarketingAutomationRunDto } from '@spacode/types';
import { Errors } from '@spacode/utils';
import { enqueueAiContent } from '../../lib/queue.js';
import { toMarketingPlanDto } from '../../lib/mappers.js';

export async function listPlans(businessId: string) {
  const plans = await prisma.marketingPlan.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { contentItems: true } } },
  });
  return plans.map(toMarketingPlanDto);
}

export async function getPlan(businessId: string, planId: string) {
  const plan = await prisma.marketingPlan.findFirst({
    where: { id: planId, businessId },
    include: {
      _count: { select: { contentItems: true } },
      contentItems: { orderBy: { scheduledAt: 'asc' }, take: 200 },
    },
  });
  if (!plan) throw Errors.notFound('Marketing plan not found');

  const run = await prisma.marketingAutomationRun.findFirst({
    where: { marketingPlanId: planId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    plan: toMarketingPlanDto(plan),
    contentItems: plan.contentItems,
    run: run ? toRunDto(run) : null,
  };
}

export async function createPlan(businessId: string, data: GenerateContentPlanDto) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw Errors.notFound('Business not found');

  const horizonDays = data.horizonDays;
  const plan = await prisma.marketingPlan.create({
    data: {
      businessId,
      strategy: data.strategy ?? null,
      status: 'generating',
      horizonDays,
    },
  });

  const run = await prisma.marketingAutomationRun.create({
    data: {
      businessId,
      marketingPlanId: plan.id,
      horizonDays,
      status: MarketingAutomationRunStatus.QUEUED,
      progress: { itemsGenerated: 0, totalItems: horizonDays === 30 ? 12 : 36 },
    },
  });

  await enqueueAiContent({
    runId: run.id,
    businessId,
    marketingPlanId: plan.id,
    horizonDays,
  });

  return { plan: toMarketingPlanDto(plan), run: toRunDto(run) };
}

export async function getRunProgress(businessId: string, runId: string): Promise<MarketingAutomationRunDto> {
  const run = await prisma.marketingAutomationRun.findFirst({
    where: { id: runId, businessId },
  });
  if (!run) throw Errors.notFound('Automation run not found');
  return toRunDto(run);
}

function toRunDto(run: {
  id: string;
  businessId: string;
  marketingPlanId: string | null;
  horizonDays: number;
  status: string;
  progress: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}): MarketingAutomationRunDto {
  return {
    id: run.id,
    businessId: run.businessId,
    marketingPlanId: run.marketingPlanId,
    horizonDays: run.horizonDays,
    status: run.status,
    progress: (run.progress as Record<string, unknown>) ?? null,
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    error: run.error,
  };
}
