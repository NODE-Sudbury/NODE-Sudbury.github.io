import type { AdminMember } from '../models/admin-member';
import { getSupabase } from '../supabase';

type Row = Record<string, string | boolean | null>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const COLUMNS =
  'id, created_at, email, is_exclusive_member, is_active, is_public, handle, full_name, avatar_url, member_type, job_title, company, school, program';

const toMember = (row: Row): AdminMember => ({
  id: text(row['id']),
  createdAt: text(row['created_at']),
  email: text(row['email']),
  isExclusiveMember: row['is_exclusive_member'] === true,
  isActive: row['is_active'] !== false,
  isPublic: row['is_public'] === true,
  handle: text(row['handle']),
  fullName: text(row['full_name']),
  avatarUrl: text(row['avatar_url']),
  memberType: row['member_type'] === 'student' ? 'student' : 'professional',
  jobTitle: text(row['job_title']),
  company: text(row['company']),
  school: text(row['school']),
  program: text(row['program']),
});

/** Every member, newest first. Only the super admin and admins get rows back; the database decides. */
export const fetchAdminMembers = async (): Promise<AdminMember[]> => {
  const { data, error } = await getSupabase()
    .from('members')
    .select(COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(toMember);
};

/** How many people are subscribed to updates, leaving out those who unsubscribed. */
export const fetchSubscriberCount = async (): Promise<number> => {
  const { count, error } = await getSupabase()
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .is('unsubscribed_at', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
};
