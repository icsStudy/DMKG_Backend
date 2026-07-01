import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadSource, LeadStatus } from '@spacode/db';

vi.mock('@spacode/db', () => ({
  LeadSource: { MANUAL: 'manual', CONTACT_FORM: 'contact_form' },
  LeadStatus: { CONVERTED: 'converted' },
  prisma: {
    lead: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    interaction: { create: vi.fn(), findMany: vi.fn() },
    customer: { create: vi.fn() },
  },
}));

vi.mock('../../lib/queue.js', () => ({
  enqueueLeadScore: vi.fn(),
}));

vi.mock('@spacode/utils', () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => v.replace(/^enc:/, ''),
  Errors: {
    notFound: (msg: string) => new Error(msg),
    validation: (msg: string) => new Error(msg),
  },
}));

import { prisma } from '@spacode/db';
import { enqueueLeadScore } from '../../lib/queue.js';
import * as leads from '../leads.service.js';

describe('leads.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createLead encrypts email and enqueues score job', async () => {
    const created = {
      id: 'lead-1',
      businessId: 'biz-1',
      contactEmail: 'enc:test@example.com',
      contactFirstName: 'Test',
      contactLastName: null,
      contactPhone: null,
      contactCompany: null,
      status: 'new',
      source: LeadSource.MANUAL,
      leadScore: 0,
      metadata: null,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.lead.create).mockResolvedValue(created as never);
    vi.mocked(prisma.interaction.create).mockResolvedValue({} as never);

    const dto = await leads.createLead('biz-1', 'user-1', {
      email: 'test@example.com',
      name: 'Test',
      source: LeadSource.MANUAL,
    });

    expect(dto.email).toBe('test@example.com');
    expect(enqueueLeadScore).toHaveBeenCalledWith('lead-1');
  });

  it('softDeleteLead sets deletedAt', async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({ id: 'lead-1' } as never);
    vi.mocked(prisma.lead.update).mockResolvedValue({} as never);

    await leads.softDeleteLead('biz-1', 'lead-1');
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    );
  });

  it('bulkImport rejects over 500 leads', async () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({ email: `u${i}@t.com` }));
    await expect(leads.bulkImport('biz-1', undefined, rows)).rejects.toThrow('Maximum 500');
  });
});
