import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAdminPartners } from './admin-partners';

const second = vi.fn();
const first = vi.fn(() => ({ order: second }));
const select = vi.fn(() => ({ order: first }));
const from = vi.fn(() => ({ select }));
const getPublicUrl = vi.fn((path: string) => ({
  data: { publicUrl: `https://cdn.example/${path}` },
}));
const bucket = vi.fn(() => ({ getPublicUrl }));

vi.mock('../supabase', () => ({ getSupabase: () => ({ from, storage: { from: bucket } }) }));

describe('db/admin-partners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists the partners in order, with each logo as an address in the logo bucket', async () => {
    second.mockResolvedValue({
      data: [
        {
          id: 'p1',
          name: 'Norcat',
          website_url: 'https://www.norcat.org/',
          logo_path: 'norcat.jpg',
          sort_order: 2,
        },
        { id: 'p2', name: 'No logo', website_url: null, logo_path: '', sort_order: null },
      ],
      error: null,
    });

    const partners = await fetchAdminPartners();

    expect(from).toHaveBeenCalledWith('partners');
    expect(first).toHaveBeenCalledWith('sort_order', { ascending: true });
    expect(second).toHaveBeenCalledWith('name', { ascending: true });
    expect(bucket).toHaveBeenCalledWith('partner-logos');
    expect(partners).toEqual([
      {
        id: 'p1',
        name: 'Norcat',
        websiteUrl: 'https://www.norcat.org/',
        logoUrl: 'https://cdn.example/norcat.jpg',
        sortOrder: 2,
      },
      { id: 'p2', name: 'No logo', websiteUrl: '', logoUrl: '', sortOrder: 0 },
    ]);
  });

  it('throws when the partners cannot be read', async () => {
    second.mockResolvedValue({ data: null, error: { message: 'denied' } });

    await expect(fetchAdminPartners()).rejects.toThrow('denied');
  });
});
