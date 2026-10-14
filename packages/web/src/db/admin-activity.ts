import type { ActivityAction, ActivityEntry } from '../models/activity';
import { getSupabase } from '../supabase';

type Row = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const ACTIONS: readonly ActivityAction[] = ['insert', 'update', 'delete'];

/** How many of the latest entries the dashboard loads. Older ones stay in the database. */
export const ACTIVITY_LIMIT = 500;

/** The latest entries of the activity log, newest first. Only the super admin gets rows back. */
export const fetchActivity = async (): Promise<ActivityEntry[]> => {
  const { data, error } = await getSupabase()
    .from('audit_log')
    .select('id, at, actor_email, actor_role, action, target_table, summary, changes')
    .order('at', { ascending: false })
    .order('id', { ascending: false })
    .limit(ACTIVITY_LIMIT);
  if (error) throw new Error(error.message);
  const entries: ActivityEntry[] = [];
  for (const row of (data ?? []) as Row[]) {
    const action = ACTIONS.find((known) => known === row['action']);
    if (!action) continue;
    const changes = row['changes'];
    entries.push({
      id: typeof row['id'] === 'number' ? row['id'] : 0,
      at: text(row['at']),
      actorEmail: text(row['actor_email']),
      actorRole: text(row['actor_role']),
      action,
      table: text(row['target_table']),
      summary: text(row['summary']),
      changes:
        changes && typeof changes === 'object' && !Array.isArray(changes)
          ? (changes as Record<string, unknown>)
          : {},
    });
  }
  return entries;
};
