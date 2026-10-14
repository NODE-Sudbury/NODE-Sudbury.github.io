import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Partner } from '../models/partner';
import type { Content } from '../store/content';
import { organizationToPartner, withPartners, withSupabasePartners } from './partners';

const URL = 'https://project.supabase.co';

const sample = (id: string, parentId: string, name: string): Partner => ({
  id,
  parentId,
  name,
  order: 0,
  url: 'mailto:admin@example.com',
  logoUrl: `/images/${id}.jpg`,
});

const content = {
  partnerGroups: [
    { id: '1', title: 'Become a partner', order: 1 },
    { id: '0', title: 'Community partners', order: 0 },
  ],
  partners: [sample('old', '0', 'Old Partner'), sample('cta', '1', 'Your logo here')],
} as unknown as Partial<Content>;

const partnerRows = [
  {
    id: 'p2',
    name: 'Norcat',
    website_url: 'https://norcat.org/',
    logo_path: 'norcat.jpg',
    sort_order: 1,
  },
  { id: 'p1', name: 'GDG', website_url: '', logo_path: 'gdg.jpg', sort_order: 0 },
  { id: 'p3', name: 'No logo', website_url: 'https://x.example', logo_path: '', sort_order: 2 },
];

const sponsorRows = [
  { id: 's2', name: 'Bronze Co', logo_path: 'b.png', tier: 'bronze', sort_order: 0 },
  { id: 's1', name: 'Gold Co', logo_path: 'g.png', tier: 'gold', sort_order: 5 },
];

describe('organizationToPartner', () => {
  it('makes a partner of the block with the address of its logo in the bucket', () => {
    expect(organizationToPartner(partnerRows[0]!, '0', 'partner-logos', URL)).toEqual({
      id: 'p2',
      parentId: '0',
      name: 'Norcat',
      url: 'https://norcat.org/',
      order: 1,
      logoUrl: `${URL}/storage/v1/object/public/partner-logos/norcat.jpg`,
    });
  });
});

describe('withPartners', () => {
  it('replaces the community partners and keeps the call to become a partner', () => {
    const result = withPartners(content, partnerRows, [], URL);

    const community = result.partners!.filter(({ parentId }) => parentId === '0');
    expect(community.map(({ name }) => name)).toEqual(['Norcat', 'GDG']);
    expect(community[0]!.logoUrl).toContain('/partner-logos/norcat.jpg');
    expect(result.partners!.some(({ name }) => name === 'Old Partner')).toBe(false);
    expect(result.partners!.some(({ name }) => name === 'Your logo here')).toBe(true);
    expect(result.partnerGroups).toBe(content.partnerGroups);
  });

  it('leaves out a partner without a logo, because the block shows logos', () => {
    const result = withPartners(content, partnerRows, [], URL);

    expect(result.partners!.some(({ name }) => name === 'No logo')).toBe(false);
  });

  it('puts the sponsors in a group above the partners, the highest tier first', () => {
    const result = withPartners(content, partnerRows, sponsorRows, URL);

    const [first] = [...result.partnerGroups!].sort((a, b) => a.order - b.order);
    expect(first).toMatchObject({ id: 'sponsors', title: 'Sponsors', order: -1 });
    const sponsors = result.partners!.filter(({ parentId }) => parentId === 'sponsors');
    expect(sponsors.map(({ name }) => name)).toEqual(['Gold Co', 'Bronze Co']);
    expect(sponsors.map(({ order }) => order)).toEqual([0, 1]);
    expect(sponsors[0]!.logoUrl).toContain('/sponsor-logos/g.png');
  });

  it('adds no sponsor group when there are no sponsors', () => {
    const result = withPartners(content, partnerRows, [], URL);

    expect(result.partnerGroups!.some(({ id }) => id === 'sponsors')).toBe(false);
  });

  it('keeps the sample partners when the database has none', () => {
    expect(withPartners(content, [], [], URL)).toBe(content);
    expect(withPartners(content, [partnerRows[2]!], [], URL)).toBe(content);
  });

  it('shows only sponsors when there are no partners, and keeps the sample partners', () => {
    const result = withPartners(content, [], sponsorRows, URL);

    expect(result.partners!.some(({ name }) => name === 'Old Partner')).toBe(true);
    expect(result.partners!.some(({ name }) => name === 'Gold Co')).toBe(true);
  });

  it('leaves content without groups as it was', () => {
    const bare = { partnerGroups: [], partners: [] } as unknown as Partial<Content>;

    expect(withPartners(bare, partnerRows, sponsorRows, URL)).toBe(bare);
    expect(withPartners({}, partnerRows, sponsorRows, URL)).toEqual({});
  });
});

describe('withSupabasePartners', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads both tables with the public key and uses them', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (address) => {
      const rows = (address as string).includes('/partners?') ? partnerRows : sponsorRows;
      return { ok: true, json: async () => rows } as Response;
    });

    const result = await withSupabasePartners(content, URL, 'anon');

    expect(fetch.mock.calls.map(([address]) => address as string).sort()).toEqual([
      `${URL}/rest/v1/partners?select=*&order=sort_order.asc,name.asc`,
      `${URL}/rest/v1/sponsors?select=*&order=sort_order.asc,name.asc`,
    ]);
    expect(result.partners!.some(({ name }) => name === 'Gold Co')).toBe(true);
    expect(result.partners!.some(({ name }) => name === 'Norcat')).toBe(true);
  });

  it('keeps the content when Supabase cannot be read, or is not set up', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await withSupabasePartners(content, URL, 'anon')).toBe(content);

    expect(await withSupabasePartners(content, undefined, undefined)).toBe(content);
  });
});
