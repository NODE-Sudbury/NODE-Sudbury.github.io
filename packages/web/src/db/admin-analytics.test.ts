import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDailyViews, fetchTopPages } from './admin-analytics';

const rpc = vi.fn();

vi.mock('../supabase', () => ({ getSupabase: () => ({ rpc }) }));

describe('db/admin-analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the most viewed pages, with counts as numbers', async () => {
    rpc.mockResolvedValue({
      data: [
        { path: '/blog/hello', views: '12' },
        { path: '/events', views: 3 },
        { path: null, views: 'many' },
      ],
      error: null,
    });

    const pages = await fetchTopPages(30);

    expect(rpc).toHaveBeenCalledWith('analytics_pages', { p_days: 30 });
    expect(pages).toEqual([
      { path: '/blog/hello', views: 12 },
      { path: '/events', views: 3 },
      { path: '', views: 0 },
    ]);
  });

  it('reads the views of each day', async () => {
    rpc.mockResolvedValue({ data: [{ day: '2026-10-14', views: '5' }], error: null });

    await expect(fetchDailyViews(7)).resolves.toEqual([{ day: '2026-10-14', views: 5 }]);
    expect(rpc).toHaveBeenCalledWith('analytics_daily', { p_days: 7 });
  });

  it('throws when the numbers cannot be read', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'denied' } });

    await expect(fetchTopPages(7)).rejects.toThrow('denied');
    await expect(fetchDailyViews(7)).rejects.toThrow('denied');
  });
});
