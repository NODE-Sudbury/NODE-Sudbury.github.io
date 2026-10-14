/** What someone who helps run the site may do: the roles of the `admins` table. */
export type AdminRole = 'super_admin' | 'admin' | 'check_in_volunteer';

/** The roles that open the admin dashboard. A check-in volunteer only checks people in. */
export const canOpenDashboard = (role: AdminRole | undefined): boolean =>
  role === 'super_admin' || role === 'admin';

/**
 * Whether someone with this role may add or remove people with the target role. The super admin
 * manages board admins and volunteers, admins manage volunteers, and nobody manages a super admin.
 */
export const canManageRole = (viewer: AdminRole | undefined, target: AdminRole): boolean =>
  (viewer === 'super_admin' && target !== 'super_admin') ||
  (viewer === 'admin' && target === 'check_in_volunteer');
