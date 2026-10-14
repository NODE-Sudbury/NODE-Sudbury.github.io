/** What someone who helps run the site may do: the roles of the `admins` table. */
export type AdminRole = 'super_admin' | 'admin' | 'check_in_volunteer';

/** The roles that open the admin dashboard. A check-in volunteer only checks people in. */
export const canOpenDashboard = (role: AdminRole | undefined): boolean =>
  role === 'super_admin' || role === 'admin';
