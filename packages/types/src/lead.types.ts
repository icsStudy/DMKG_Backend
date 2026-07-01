export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export type LeadSource =
  | 'api'
  | 'webhook'
  | 'manual'
  | 'crm_sync'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'twitter'
  | 'youtube';

export interface CreateLeadPayload {
  source: LeadSource;
  sourceDetail?: string;
  businessId?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactCompany?: string;
  contactTitle?: string;
  contactLinkedIn?: string;
  companyName?: string;
  companyDomain?: string;
  companyIndustry?: string;
  companySize?: string;
  companyCountry?: string;
  companyCity?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateLeadPayload extends Partial<CreateLeadPayload> {
  status?: LeadStatus;
}

export interface LeadFilters {
  status?: LeadStatus;
  source?: LeadSource;
  businessId?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface LeadDto {
  id: string;
  businessId: string | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  company: string | null;
  status: LeadStatus | string;
  source: LeadSource | string;
  score: number;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadDto {
  email?: string;
  name?: string;
  phone?: string;
  company?: string;
  source?: LeadSource | string;
  notes?: string;
  tags?: string[];
  contactEmail?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  contactCompany?: string;
}

export type UpdateLeadDto = Partial<CreateLeadDto> & { status?: LeadStatus | string };
