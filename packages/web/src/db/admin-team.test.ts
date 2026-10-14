import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addTeamMember, fetchTeam, removeTeamMember } from './admin-team';

let result: { data?: unknown; error: { message: string } | null } = { data: [], error: null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chain: Record<string, any> = {};
for (const method of ['select', 'order', 'eq', 'insert', 'delete']) {
  chain[method] = vi.fn(() => chain);
}
chain['then'] = (resolve: (value: typeof result) => unknown) =>
  Promise.resolve(result).then(resolve);
const from = vi.fn(() => chain);

vi.mock('../supabase', () => ({ getSupabase: () => ({ from }) }));

describe('db/admin-team', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    result = { data: [], error: null };
  });

  it('lists the team with who each person is, the super admin first', async () => {
    result = {
      data: [
        {
          user_id: 'u2',
          role: 'admin',
          created_at: '2026-10-01T00:00:00Z',
          members: { full_name: 'Grace Hopper', email: 'grace@example.com', avatar_url: null },
        },
        {
          user_id: 'u1',
          role: 'super_admin',
          created_at: '2026-10-02T00:00:00Z',
          members: { full_name: 'Ada Lovelace', email: 'ada@example.com', avatar_url: 'a.jpg' },
        },
        { user_id: 'u3', role: 'owner', created_at: null, members: null },
      ],
      error: null,
    };

    const team = await fetchTeam();

    expect(from).toHaveBeenCalledWith('admins');
    expect(team.map(({ userId }) => userId)).toEqual(['u1', 'u2']);
    expect(team[0]).toMatchObject({
      role: 'super_admin',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      avatarUrl: 'a.jpg',
    });
    expect(team[1]).toMatchObject({ avatarUrl: '' });
  });

  it('throws when the team cannot be read', async () => {
    result = { error: { message: 'denied' } };

    await expect(fetchTeam()).rejects.toThrow('denied');
  });

  it('adds a member with a role', async () => {
    await addTeamMember('u9', 'check_in_volunteer');

    expect(chain['insert']).toHaveBeenCalledWith({ user_id: 'u9', role: 'check_in_volunteer' });
  });

  it('throws when the database refuses to add someone', async () => {
    result = { error: { message: 'violates row-level security policy' } };

    await expect(addTeamMember('u9', 'admin')).rejects.toThrow('row-level security');
  });

  it('removes someone from the team', async () => {
    await removeTeamMember('u9');

    expect(chain['delete']).toHaveBeenCalled();
    expect(chain['eq']).toHaveBeenCalledWith('user_id', 'u9');
  });
});
