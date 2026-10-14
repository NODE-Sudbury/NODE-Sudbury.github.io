import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTIVITY_LIMIT, fetchActivity } from './admin-activity';

let result: { data?: unknown; error: { message: string } | null } = { data: [], error: null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chain: Record<string, any> = {};
for (const method of ['select', 'order', 'limit']) chain[method] = vi.fn(() => chain);
chain['then'] = (resolve: (value: typeof result) => unknown) =>
  Promise.resolve(result).then(resolve);
const from = vi.fn(() => chain);

vi.mock('../supabase', () => ({ getSupabase: () => ({ from }) }));

describe('db/admin-activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    result = { data: [], error: null };
  });

  it('reads the latest entries, newest first', async () => {
    result = {
      data: [
        {
          id: 7,
          at: '2026-10-14T01:00:00Z',
          actor_email: 'ada@example.com',
          actor_role: 'super_admin',
          action: 'update',
          target_table: 'partners',
          summary: 'Norcat',
          changes: { name: { from: 'Norcat', to: 'NORCAT' } },
        },
        { id: 8, action: 'explode', changes: null },
        { id: 9, action: 'delete', changes: [1, 2] },
      ],
      error: null,
    };

    const entries = await fetchActivity();

    expect(from).toHaveBeenCalledWith('audit_log');
    expect(chain['order']).toHaveBeenCalledWith('at', { ascending: false });
    expect(chain['limit']).toHaveBeenCalledWith(ACTIVITY_LIMIT);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      id: 7,
      at: '2026-10-14T01:00:00Z',
      actorEmail: 'ada@example.com',
      actorRole: 'super_admin',
      action: 'update',
      table: 'partners',
      summary: 'Norcat',
      changes: { name: { from: 'Norcat', to: 'NORCAT' } },
    });
    expect(entries[1]).toMatchObject({ id: 9, action: 'delete', changes: {} });
  });

  it('throws when the log cannot be read', async () => {
    result = { error: { message: 'denied' } };

    await expect(fetchActivity()).rejects.toThrow('denied');
  });
});
