import { describe, expect, it } from 'vitest';
import { computeLeadScore } from './lead-scoring.ts';

describe('computeLeadScore', () => {
  it('returns 0 for empty lead', () => {
    expect(computeLeadScore({})).toBe(0);
  });

  it('caps at 100', () => {
    const score = computeLeadScore({
      contactEmail: 'a@b.com',
      contactPhone: '050',
      contactLinkedIn: 'https://linkedin.com/in/x',
      companyDomain: 'acme.com',
      companyName: 'Acme',
      companyIndustry: 'Tech',
      companySize: '50',
      contactTitle: 'CEO',
      tags: ['hot', 'enterprise', 'priority'],
      source: 'linkedin',
    });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThan(50);
  });

  it('adds points for company domain', () => {
    expect(computeLeadScore({ companyDomain: 'example.com' })).toBe(20);
  });
});
