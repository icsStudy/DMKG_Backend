import type { Business, MembershipRole, SystemRole } from '@spacode/db';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      orgId?: string;
      systemRole?: SystemRole;
      membershipRole?: MembershipRole;
      business?: Business;
    }
  }
}

export {};
