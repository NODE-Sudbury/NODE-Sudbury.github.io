import type { AdminRole } from './admin';

/** Someone who helps run the site: a row of the `admins` table with who they are. */
export interface TeamMember {
  userId: string;
  role: AdminRole;
  addedAt: string;
  fullName: string;
  email: string;
  avatarUrl: string;
}
