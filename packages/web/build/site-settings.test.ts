import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SiteConfig } from './resolve-config';
import { SOCIAL_NETWORKS, withSiteSettings, withSupabaseSiteSettings } from './site-settings';

const column = [
  { name: 'X', url: 'https://x.com/old', newTab: true },
  { name: 'Instagram', url: 'https://instagram.com/old', newTab: true },
  { name: 'Facebook', url: 'https://facebook.com/old', newTab: true },
  { name: 'LinkedIn', url: 'https://linkedin.com/company/old', newTab: true },
];

const config = (follow: { name: string; url: string }[]) =>
  ({
    site: { url: 'https://nodesudbury.com/', social: { hashtag: 'N.O.D.E.', follow } },
    resources: {
      footerRelBlock: [
        { title: 'About', links: [{ name: 'N.O.D.E.', url: '/', newTab: false }] },
        { title: 'Follow N.O.D.E.', links: column },
      ],
    },
  }) as unknown as SiteConfig;

const footerColumn = (result: SiteConfig) =>
  (
    result.resources as unknown as {
      footerRelBlock: { title: string; links: { name: string; url: string }[] }[];
    }
  ).footerRelBlock
    .find(({ title }) => title === 'Follow N.O.D.E.')
    ?.links.map(({ name, url }) => `${name} ${url}`);

const original = [
  { name: 'x', url: 'https://x.com/old' },
  { name: 'instagram', url: 'https://instagram.com/old' },
  { name: 'facebook', url: 'https://facebook.com/old' },
  { name: 'linkedin', url: 'https://linkedin.com/company/old' },
];

const follow = (result: SiteConfig) =>
  (result.site.social.follow as { name: string; url: string }[]).map(
    ({ name, url }) => `${name} ${url}`,
  );

describe('withSiteSettings', () => {
  it('uses the link of each network from the settings', () => {
    const result = withSiteSettings(config(original), [
      { key: 'social_x', value: 'https://x.com/new' },
      { key: 'social_linkedin', value: 'https://linkedin.com/company/new' },
    ]);

    expect(follow(result)).toEqual([
      'x https://x.com/new',
      'instagram https://instagram.com/old',
      'facebook https://facebook.com/old',
      'linkedin https://linkedin.com/company/new',
    ]);
  });

  it('leaves out a network whose link is empty, so the footer shows no empty icon', () => {
    const result = withSiteSettings(config(original), [
      { key: 'social_instagram', value: '' },
      { key: 'social_facebook', value: '   ' },
    ]);

    expect(follow(result)).toEqual([
      'x https://x.com/old',
      'linkedin https://linkedin.com/company/old',
    ]);
  });

  it('keeps the link from the site file for a network with no row', () => {
    const result = withSiteSettings(config(original), [{ key: 'social_x', value: '' }]);

    expect(follow(result)).toContain('instagram https://instagram.com/old');
    expect(follow(result)).not.toContain('x https://x.com/old');
  });

  it('adds a network that is set but was not in the site file, and keeps other networks', () => {
    const result = withSiteSettings(
      config([{ name: 'youtube', url: 'https://youtube.com/node' }]),
      [{ key: 'social_facebook', value: 'https://facebook.com/node' }],
    );

    expect(follow(result)).toEqual([
      'youtube https://youtube.com/node',
      'facebook https://facebook.com/node',
    ]);
  });

  it('ignores rows it does not know', () => {
    const result = withSiteSettings(config(original), [
      { key: 'something_else', value: 'x' },
      { key: 'social_x', value: 5 },
      { key: 7, value: 'x' },
    ]);

    expect(follow(result)).toEqual(original.map(({ name, url }) => `${name} ${url}`));
  });

  it('uses the same links in the Follow N.O.D.E. column of the footer', () => {
    const result = withSiteSettings(config(original), [
      { key: 'social_x', value: 'https://x.com/new' },
      { key: 'social_instagram', value: '' },
    ]);

    expect(footerColumn(result)).toEqual([
      'X https://x.com/new',
      'Facebook https://facebook.com/old',
      'LinkedIn https://linkedin.com/company/old',
    ]);
  });

  it('drops the whole Follow N.O.D.E. column when every network is empty, and keeps the other columns', () => {
    const result = withSiteSettings(
      config(original),
      ['social_x', 'social_instagram', 'social_facebook', 'social_linkedin'].map((key) => ({
        key,
        value: '',
      })),
    );

    expect(footerColumn(result)).toBeUndefined();
    expect(follow(result)).toEqual([]);
    expect(
      (result.resources as unknown as { footerRelBlock: { title: string }[] }).footerRelBlock.map(
        ({ title }) => title,
      ),
    ).toEqual(['About']);
  });

  it('does not change anything else in the config', () => {
    const base = config(original);

    const result = withSiteSettings(base, [{ key: 'social_x', value: '' }]);

    expect(result.site.url).toBe(base.site.url);
    expect(result.site.social.hashtag).toBe('N.O.D.E.');
    expect(follow(base)).toHaveLength(4);
  });

  it('knows the four networks the admins can set', () => {
    expect(SOCIAL_NETWORKS.map(({ name }) => name)).toEqual([
      'x',
      'instagram',
      'facebook',
      'linkedin',
    ]);
  });
});

describe('withSupabaseSiteSettings', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the settings with the public key and uses them', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ key: 'social_x', value: '' }],
    } as Response);

    const result = await withSupabaseSiteSettings(
      config(original),
      'https://p.supabase.co',
      'anon',
    );

    expect(fetch.mock.calls[0]![0]).toBe(
      'https://p.supabase.co/rest/v1/site_settings?select=*&order=key.asc',
    );
    expect(follow(result)).not.toContain('x https://x.com/old');
  });

  it('keeps the config when Supabase cannot be read or is not set up', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const base = config(original);

    expect(await withSupabaseSiteSettings(base, 'https://p.supabase.co', 'anon')).toBe(base);
    expect(await withSupabaseSiteSettings(base, undefined, undefined)).toBe(base);
  });
});
