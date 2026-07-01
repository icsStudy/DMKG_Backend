import { prisma } from '@spacode/db';
import { Errors } from '@spacode/utils';

/** P2 placeholder — CRM adapter registry */
export const CRM_ADAPTERS = ['hubspot', 'salesforce', 'pipedrive'] as const;

export async function listConnections(businessId: string) {
  return prisma.cRMConnection.findMany({ where: { businessId } });
}

export async function connectAdapter(
  businessId: string,
  adapter: string,
  accessToken: string,
): Promise<{ id: string; adapter: string; status: string }> {
  if (!CRM_ADAPTERS.includes(adapter as (typeof CRM_ADAPTERS)[number])) {
    throw Errors.validation(`Unsupported CRM adapter: ${adapter}`);
  }

  const conn = await prisma.cRMConnection.upsert({
    where: { businessId_adapter: { businessId, adapter } },
    create: { businessId, adapter, accessToken },
    update: { accessToken },
  });

  return { id: conn.id, adapter: conn.adapter, status: 'connected' };
}

export async function disconnectAdapter(businessId: string, adapter: string): Promise<void> {
  await prisma.cRMConnection.deleteMany({ where: { businessId, adapter } });
}

export async function syncLeads(_businessId: string, _adapter: string): Promise<{ synced: number }> {
  // P2 placeholder — full sync in future phase
  return { synced: 0 };
}
