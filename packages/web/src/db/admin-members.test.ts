import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAdminMembers, fetchSubscriberCount } from './admin-members';

const order = vi.fn();
const is = vi.fn();
const select = vi.fn();
const from = vi.fn(() => ({ select }));

vi.mock('../supabase', () => ({ getSupabase: () => ({ from }) }));

describe('db/admin-members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    select.mockReturnValue({ order, is });
  });

  it('lists the members, newest first, as the dashboard shows them', async () => {
    order.mockResolvedValue({
      data: [
        {
          id: 'm1',
          created_at: '2026-08-29T01:11:00Z',
          email: 'ada@example.com',
          is_exclusive_member: true,
          is_active: true,
          is_public: false,
          handle: 'ada',
          full_name: 'Ada Lovelace',
          avatar_url: null,
          member_type: 'student',
          job_title: null,
          company: null,
          school: 'Laurentian',
          program: 'CS',
        },
      ],
      error: null,
    });

    const [member] = await fetchAdminMembers();

    expect(from).toHaveBeenCalledWith('members');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(member).toMatchObject({
      id: 'm1',
      email: 'ada@example.com',
      isExclusiveMember: true,
      isPublic: false,
      memberType: 'student',
      avatarUrl: '',
      school: 'Laurentian',
    });
  });

  it('throws when the members cannot be read', async () => {
    order.mockResolvedValue({ data: null, error: { message: 'denied' } });

    await expect(fetchAdminMembers()).rejects.toThrow('denied');
  });

  it('counts the subscribers who have not unsubscribed', async () => {
    is.mockResolvedValue({ count: 7, error: null });

    await expect(fetchSubscriberCount()).resolves.toBe(7);
    expect(select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(is).toHaveBeenCalledWith('unsubscribed_at', null);
  });
});
