/** Lead scoring algorithm — max 100 points */
export function computeLeadScore(lead: {
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactLinkedIn?: string | null;
  companyDomain?: string | null;
  companyName?: string | null;
  companyIndustry?: string | null;
  companySize?: string | null;
  contactTitle?: string | null;
  tags?: string[];
  source?: string;
}): number {
  let score = 0;

  if (lead.contactEmail) score += 15;
  if (lead.contactPhone) score += 10;
  if (lead.contactLinkedIn) score += 15;
  if (lead.companyDomain) score += 20;
  if (lead.companyName) score += 10;
  if (lead.companyIndustry) score += 5;
  if (lead.companySize) score += 5;
  if (lead.contactTitle) score += 10;
  if (lead.tags && lead.tags.length > 0) score += Math.min(lead.tags.length * 2, 10);

  const highIntentSources = ['linkedin', 'manual', 'crm_sync'];
  if (lead.source && highIntentSources.includes(lead.source)) score += 10;

  return Math.min(score, 100);
}
