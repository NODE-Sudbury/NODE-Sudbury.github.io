import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Organization } from '../models/organization';
import {
  deleteOrganization,
  fetchOrganization,
  fetchOrganizations,
  saveOrganization,
} from './admin-organizations';

let result: { data?: unknown; error: { message: string } | null } = { data: [], error: null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chain: Record<string, any> = {};
for (const method of ['select', 'order', 'eq', 'limit', 'insert', 'update', 'delete']) {
  chain[method] = vi.fn(() => chain);
}
chain['maybeSingle'] = vi.fn(async () => result);
chain['then'] = (resolve: (value: typeof result) => unknown) =>
  Promise.resolve(result).then(resolve);

const from = vi.fn(() => chain);
const upload = vi.fn();
const remove = vi.fn();
const getPublicUrl = vi.fn((path: string) => ({
  data: { publicUrl: `https://cdn.example/${path}` },
}));
const bucket = vi.fn(() => ({ upload, remove, getPublicUrl }));

vi.mock('../supabase', () => ({ getSupabase: () => ({ from, storage: { from: bucket } }) }));

const fn = (name: string) => chain[name] as ReturnType<typeof vi.fn>;

const norcat: Organization = {
  id: 'p1',
  kind: 'partner',
  name: 'Norcat',
  websiteUrl: 'https://www.norcat.org/',
  logoPath: 'old.jpg',
  logoUrl: 'https://cdn.example/old.jpg',
  tier: undefined,
  sortOrder: 2,
};

const logo = new File(['png'], 'logo.png', { type: 'image/png' });

describe('db/admin-organizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    result = { data: [], error: null };
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
  });

  it('lists the sponsors with their tier and the address of each logo in the sponsor bucket', async () => {
    result = {
      data: [
        {
          id: 's1',
          name: 'Acme',
          website_url: 'https://acme.example',
          logo_path: 'a.png',
          tier: 'gold',
          sort_order: 1,
        },
        { id: 's2', name: 'Odd', website_url: null, logo_path: '', tier: 'huge', sort_order: null },
      ],
      error: null,
    };

    const sponsors = await fetchOrganizations('sponsor');

    expect(from).toHaveBeenCalledWith('sponsors');
    expect(bucket).toHaveBeenCalledWith('sponsor-logos');
    expect(sponsors[0]).toMatchObject({
      kind: 'sponsor',
      tier: 'gold',
      logoUrl: 'https://cdn.example/a.png',
      sortOrder: 1,
    });
    expect(sponsors[1]).toMatchObject({
      tier: 'community',
      logoUrl: '',
      websiteUrl: '',
      sortOrder: 0,
    });
  });

  it('lists the partners, who have no tier', async () => {
    result = { data: [{ id: 'p1', name: 'Norcat', logo_path: '', sort_order: 0 }], error: null };

    const [partner] = await fetchOrganizations('partner');

    expect(from).toHaveBeenCalledWith('partners');
    expect(partner?.tier).toBeUndefined();
  });

  it('finds one organization, or nothing', async () => {
    result = { data: { id: 'p1', name: 'Norcat', logo_path: '', sort_order: 0 }, error: null };
    await expect(fetchOrganization('partner', 'p1')).resolves.toMatchObject({ name: 'Norcat' });
    expect(fn('eq')).toHaveBeenCalledWith('id', 'p1');

    result = { data: null, error: null };
    await expect(fetchOrganization('partner', 'zzz')).resolves.toBeUndefined();
  });

  it('throws when a list cannot be read', async () => {
    result = { error: { message: 'denied' } };

    await expect(fetchOrganizations('sponsor')).rejects.toThrow('denied');
  });

  it('adds a sponsor: the logo goes to storage, then the row goes to the end of the list', async () => {
    result = { data: [{ sort_order: 4 }], error: null };

    await saveOrganization({
      kind: 'sponsor',
      name: ' Acme ',
      websiteUrl: 'https://acme.example/',
      tier: 'gold',
      logo,
    });

    expect(bucket).toHaveBeenCalledWith('sponsor-logos');
    const [path, file, options] = upload.mock.calls[0] as [string, File, { contentType: string }];
    expect(path).toMatch(/^[0-9a-f-]{36}-[a-z0-9]+\.png$/);
    expect(file).toBe(logo);
    expect(options).toEqual({ contentType: 'image/png' });
    expect(fn('insert')).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme',
        website_url: 'https://acme.example/',
        logo_path: path,
        tier: 'gold',
        sort_order: 5,
      }),
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it('adds a partner with no logo and no tier', async () => {
    await saveOrganization({ kind: 'partner', name: 'Norcat', websiteUrl: '', tier: undefined });

    expect(upload).not.toHaveBeenCalled();
    const [row] = fn('insert').mock.calls[0] as [Record<string, unknown>];
    expect(row).toMatchObject({ name: 'Norcat', logo_path: '', sort_order: 0 });
    expect(row).not.toHaveProperty('tier');
  });

  it('changes one, and removes the old logo once the new one is saved', async () => {
    await saveOrganization(
      { id: 'p1', kind: 'partner', name: 'Norcat', websiteUrl: '', tier: undefined, logo },
      norcat,
    );

    expect(fn('update')).toHaveBeenCalled();
    expect(fn('eq')).toHaveBeenCalledWith('id', 'p1');
    expect(remove).toHaveBeenCalledWith(['old.jpg']);
  });

  it('keeps the logo when editing without choosing a new one', async () => {
    await saveOrganization(
      { id: 'p1', kind: 'partner', name: 'Norcat 2', websiteUrl: '', tier: undefined },
      norcat,
    );

    expect(upload).not.toHaveBeenCalled();
    expect(fn('update')).toHaveBeenCalledWith(expect.objectContaining({ logo_path: 'old.jpg' }));
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes the new logo again when the table refuses the change', async () => {
    result = { data: [], error: { message: 'denied' } };

    await expect(
      saveOrganization({ kind: 'partner', name: 'X', websiteUrl: '', tier: undefined, logo }),
    ).rejects.toThrow('denied');

    const [path] = upload.mock.calls[0] as [string];
    expect(remove).toHaveBeenCalledWith([path]);
  });

  it('stops when the logo cannot be uploaded', async () => {
    upload.mockResolvedValue({ error: { message: 'too big' } });

    await expect(
      saveOrganization({ kind: 'partner', name: 'X', websiteUrl: '', tier: undefined, logo }),
    ).rejects.toThrow('too big');
    expect(fn('insert')).not.toHaveBeenCalled();
  });

  it('deletes the row and its logo', async () => {
    await deleteOrganization(norcat);

    expect(from).toHaveBeenCalledWith('partners');
    expect(fn('delete')).toHaveBeenCalled();
    expect(fn('eq')).toHaveBeenCalledWith('id', 'p1');
    expect(remove).toHaveBeenCalledWith(['old.jpg']);
  });

  it('keeps the logo when the row cannot be deleted', async () => {
    result = { error: { message: 'denied' } };

    await expect(deleteOrganization(norcat)).rejects.toThrow('denied');
    expect(remove).not.toHaveBeenCalled();
  });
});
