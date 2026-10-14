import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSocialLinks, saveSocialLinks } from './admin-settings';

let result: { data?: unknown; error: { message: string } | null } = { data: [], error: null };

const upsert = vi.fn();
const select = vi.fn();
const from = vi.fn(() => ({ select, upsert }));

vi.mock('../supabase', () => ({ getSupabase: () => ({ from }) }));

describe('db/admin-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    result = { data: [], error: null };
    select.mockImplementation(() => Promise.resolve(result));
    upsert.mockImplementation(() => Promise.resolve(result));
  });

  it('reads the saved links, and an empty link for a network with no row', async () => {
    result = {
      data: [
        { key: 'social_x', value: 'https://x.com/nodesudbury' },
        { key: 'social_linkedin', value: 'https://linkedin.com/company/node' },
        { key: 'something_else', value: 'ignored' },
        { key: 'social_facebook', value: null },
      ],
      error: null,
    };

    const links = await fetchSocialLinks();

    expect(from).toHaveBeenCalledWith('site_settings');
    expect(links).toEqual({
      social_x: 'https://x.com/nodesudbury',
      social_instagram: '',
      social_facebook: '',
      social_linkedin: 'https://linkedin.com/company/node',
    });
  });

  it('throws when the settings cannot be read', async () => {
    result = { error: { message: 'down' } };

    await expect(fetchSocialLinks()).rejects.toThrow('down');
  });

  it('saves all four links, a cleared one as empty', async () => {
    await saveSocialLinks({
      social_x: 'https://x.com/nodesudbury',
      social_instagram: '',
      social_facebook: 'https://facebook.com/nodesudbury',
      social_linkedin: '',
    });

    expect(upsert).toHaveBeenCalledWith(
      [
        { key: 'social_x', value: 'https://x.com/nodesudbury' },
        { key: 'social_instagram', value: '' },
        { key: 'social_facebook', value: 'https://facebook.com/nodesudbury' },
        { key: 'social_linkedin', value: '' },
      ],
      { onConflict: 'key' },
    );
  });

  it('throws when the links cannot be saved', async () => {
    result = { error: { message: 'denied' } };

    await expect(
      saveSocialLinks({
        ...{ social_x: '', social_instagram: '', social_facebook: '', social_linkedin: '' },
      }),
    ).rejects.toThrow('denied');
  });
});
