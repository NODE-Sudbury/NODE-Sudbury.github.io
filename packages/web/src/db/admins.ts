import type { AdminRole } from '../models/admin';
import { getSupabase } from '../supabase';

const ROLES: readonly AdminRole[] = ['super_admin', 'admin', 'check_in_volunteer'];

/**
 * The member's own admin role, or undefined when they have none. The table lets anyone read their
 * own row, which is all the site needs to decide what to show them.
 */
export const fetchOwnAdminRole = async (uid: string): Promise<AdminRole | undefined> => {
  const { data, error } = await getSupabase()
    .from('admins')
    .select('role')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const role = (data as { role?: unknown } | null)?.role;
  return ROLES.find((known) => known === role);
};
