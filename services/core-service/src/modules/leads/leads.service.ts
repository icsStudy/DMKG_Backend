import { LeadSource, LeadStatus, prisma } from '@spacode/db';
import type { CreateLeadDto, LeadDto, UpdateLeadDto } from '@spacode/types';
import { decrypt, encrypt, Errors } from '@spacode/utils';
import { enqueueLeadScore } from '../../lib/queue.js';

const BULK_MAX = 500;

function leadName(lead: {
  contactFirstName?: string | null;
  contactLastName?: string | null;
}): string | null {
  const parts = [lead.contactFirstName, lead.contactLastName].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

function toDto(lead: {
  id: string;
  businessId: string | null;
  contactEmail: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactPhone: string | null;
  contactCompany: string | null;
  status: string;
  source: string;
  leadScore: number;
  metadata: unknown;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}): LeadDto {
  let email: string | null = null;
  if (lead.contactEmail) {
    try {
      email = decrypt(lead.contactEmail);
    } catch {
      email = lead.contactEmail;
    }
  }
  const notes =
    lead.metadata && typeof lead.metadata === 'object' && 'notes' in lead.metadata
      ? String((lead.metadata as { notes?: string }).notes ?? '')
      : null;

  return {
    id: lead.id,
    businessId: lead.businessId,
    email,
    name: leadName(lead),
    phone: lead.contactPhone,
    company: lead.contactCompany ?? lead.contactCompany,
    status: lead.status,
    source: lead.source,
    score: lead.leadScore,
    notes,
    tags: lead.tags,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export async function listLeads(
  businessId: string,
  opts: { skip: number; limit: number; status?: string; search?: string },
) {
  const where = { businessId, deletedAt: null, ...(opts.status && { status: opts.status }) };
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: opts.skip,
    take: opts.limit,
  });

  let dtos = leads.map(toDto);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    dtos = dtos.filter(
      (l) =>
        l.email?.toLowerCase().includes(q) ||
        l.name?.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q),
    );
  }

  const total = await prisma.lead.count({ where });
  return { items: dtos, total };
}

export async function getLead(businessId: string, leadId: string): Promise<LeadDto> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, businessId, deletedAt: null },
  });
  if (!lead) throw Errors.notFound('Lead not found');
  return toDto(lead);
}

export async function createLead(
  businessId: string,
  _userId: string | undefined,
  data: CreateLeadDto,
): Promise<LeadDto> {
  const rawEmail = data.email ?? data.contactEmail;
  const lead = await prisma.lead.create({
    data: {
      businessId,
      contactEmail: rawEmail ? encrypt(rawEmail) : null,
      contactFirstName: data.contactFirstName ?? data.name?.split(' ')[0],
      contactLastName: data.contactLastName ?? data.name?.split(' ').slice(1).join(' '),
      contactPhone: data.phone ?? data.contactPhone,
      contactCompany: data.company ?? data.contactCompany,
      source: (data.source as string) ?? LeadSource.MANUAL,
      tags: data.tags ?? [],
      metadata: data.notes ? { notes: data.notes } : undefined,
    },
  });
  await prisma.interaction.create({
    data: { leadId: lead.id, type: 'created', content: 'Lead created' },
  });
  await enqueueLeadScore(lead.id);
  return toDto(lead);
}

export async function updateLead(
  businessId: string,
  leadId: string,
  data: UpdateLeadDto,
): Promise<LeadDto> {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, businessId, deletedAt: null },
  });
  if (!existing) throw Errors.notFound('Lead not found');

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      ...(data.email && { contactEmail: encrypt(data.email) }),
      contactFirstName: data.contactFirstName,
      contactLastName: data.contactLastName,
      contactPhone: data.phone ?? data.contactPhone,
      contactCompany: data.company ?? data.contactCompany,
      status: data.status,
      tags: data.tags,
      source: data.source as string | undefined,
      metadata: data.notes ? { notes: data.notes } : undefined,
    },
  });
  return toDto(lead);
}

export async function softDeleteLead(businessId: string, leadId: string): Promise<void> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, businessId, deletedAt: null },
  });
  if (!lead) throw Errors.notFound('Lead not found');
  await prisma.lead.update({ where: { id: leadId }, data: { deletedAt: new Date() } });
}

export async function bulkImport(
  businessId: string,
  userId: string | undefined,
  leads: CreateLeadDto[],
): Promise<{ imported: number }> {
  if (leads.length > BULK_MAX) {
    throw Errors.validation(`Maximum ${BULK_MAX} leads per import`);
  }
  for (const row of leads) {
    await createLead(businessId, userId, row);
  }
  return { imported: leads.length };
}

export async function getTimeline(businessId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, businessId, deletedAt: null },
  });
  if (!lead) throw Errors.notFound('Lead not found');
  return prisma.interaction.findMany({
    where: { leadId },
    orderBy: { timestamp: 'desc' },
  });
}

export async function convertToCustomer(businessId: string, leadId: string): Promise<LeadDto> {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, businessId, deletedAt: null },
  });
  if (!existing) throw Errors.notFound('Lead not found');

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { status: LeadStatus.CONVERTED },
  });

  await prisma.customer.create({
    data: {
      leadId: lead.id,
      businessId,
      name: leadName(lead),
      email: existing.contactEmail ? decrypt(existing.contactEmail) : null,
      phone: lead.contactPhone,
    },
  });

  await prisma.interaction.create({
    data: { leadId, type: 'converted', content: 'Converted to customer' },
  });
  return toDto(lead);
}

export async function handleContactForm(data: {
  businessId?: string;
  businessSlug?: string;
  email: string;
  name?: string;
  phone?: string;
  message?: string;
}): Promise<LeadDto> {
  let businessId = data.businessId;
  if (!businessId && data.businessSlug) {
    const business = await prisma.business.findFirst({
      where: { name: data.businessSlug, deletedAt: null },
    });
    if (!business) throw Errors.notFound('Business not found');
    businessId = business.id;
  }
  if (!businessId) throw Errors.validation('businessId required');

  return createLead(businessId, undefined, {
    email: data.email,
    name: data.name,
    phone: data.phone,
    source: LeadSource.CONTACT_FORM,
    notes: data.message,
  });
}
