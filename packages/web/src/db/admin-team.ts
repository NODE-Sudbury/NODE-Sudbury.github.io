import type { AdminRole } from '../models/admin';
import type { TeamMember } from '../models/team-member';
import { getSupabase } from '../supabase';

type Embedded = { full_name?: unknown; email?: unknown; avatar_url?: unknown };
type Row = { user_id?: unknown; role?: unknown; created_at?: unknown; members?: Embedded | null };

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const ROLES: readonly AdminRole[] = ['super_admin', 'admin', 'check_in_volunteer'];

/** Everyone on the team, the super admin first, then by when they were added. */
export const fetchTeam = async (): Promise<TeamMember[]> => {
  const { data, error } = await getSupabase()
    .from('admins')
    .select('user_id, role, created_at, members!admins_user_id_fkey(full_name, email, avatar_url)')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const team: TeamMember[] = [];
  for (const row of (data ?? []) as unknown as Row[]) {
    const role = ROLES.find((known) => known === row.role);
    if (!role) continue;
    team.push({
      userId: text(row.user_id),
      role,
      addedAt: text(row.created_at),
      fullName: text(row.members?.full_name),
      email: text(row.members?.email),
      avatarUrl: text(row.members?.avatar_url),
    });
  }
  // The super admin leads, and the sort is stable for the rest.
  return team.sort((a, b) => Number(b.role === 'super_admin') - Number(a.role === 'super_admin'));
};

/** Gives a member a role on the team. The database decides who may give which role. */
export const addTeamMember = async (
  userId: string,
  role: Exclude<AdminRole, 'super_admin'>,
): Promise<void> => {
  const { error } = await getSupabase().from('admins').insert({ user_id: userId, role });
  if (error) throw new Error(error.message);
};

/** Takes someone off the team. The super admin cannot be removed. */
export const removeTeamMember = async (userId: string): Promise<void> => {
  const { error } = await getSupabase().from('admins').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
};
