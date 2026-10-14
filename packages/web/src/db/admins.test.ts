import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOwnAdminRole } from './admins';

const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock('../supabase', () => ({ getSupabase: () => ({ from }) }));

describe('db/admins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the member's own role", async () => {
    maybeSingle.mockResolvedValue({ data: { role: 'super_admin' }, error: null });

    await expect(fetchOwnAdminRole('user-1')).resolves.toBe('super_admin');
    expect(from).toHaveBeenCalledWith('admins');
    expect(select).toHaveBeenCalledWith('role');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('gives nothing for someone who is not an admin, or an unknown role', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(fetchOwnAdminRole('user-2')).resolves.toBeUndefined();

    maybeSingle.mockResolvedValue({ data: { role: 'owner' }, error: null });
    await expect(fetchOwnAdminRole('user-2')).resolves.toBeUndefined();
  });

  it('throws when the lookup fails', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'network' } });

    await expect(fetchOwnAdminRole('user-1')).rejects.toThrow('network');
  });
});
