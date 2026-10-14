import { fetchPublicRows, type Row } from '../src/data/public-rows';
import type { SiteConfig } from './resolve-config';

/** The social networks the admins can set, by the key of their row and the name the footer uses. */
export const SOCIAL_NETWORKS = [
  { key: 'social_x', name: 'x' },
  { key: 'social_instagram', name: 'instagram' },
  { key: 'social_facebook', name: 'facebook' },
  { key: 'social_linkedin', name: 'linkedin' },
] as const;

interface Follow {
  name: string;
  url: string;
}

interface FooterLink {
  name: string;
  url: string;
  newTab?: boolean;
}

interface FooterBlock {
  title: string;
  links: FooterLink[];
}

/** The footer column that lists NODE's networks again, next to the icons. */
const FOLLOW_COLUMN = 'Follow NODE';

/**
 * The config with the "Follow us" links taken from the site settings, in the icons and in the
 * "Follow NODE" column of the footer. A network with a link uses it, a network with an empty link
 * is left out, and a network with no row keeps the link from the site file. Networks the admins
 * cannot set stay where they were.
 */
export const withSiteSettings = (config: SiteConfig, rows: Row[]): SiteConfig => {
  const set = new Map(
    rows.flatMap((row) =>
      typeof row['key'] === 'string' && typeof row['value'] === 'string'
        ? [[row['key'], row['value'].trim()] as const]
        : [],
    ),
  );
  const managed = new Map<string, string>(SOCIAL_NETWORKS.map(({ key, name }) => [name, key]));
  /** The link for a network by its name in any case, or undefined when there is no row for it. */
  const setting = (name: string) => {
    const key = managed.get(name.toLowerCase());
    return key === undefined ? undefined : set.get(key);
  };

  const follow = config.site.social.follow as Follow[];
  const icons: Follow[] = [];
  for (const entry of follow) {
    const value = setting(entry.name);
    if (value === undefined) icons.push(entry);
    else if (value !== '') icons.push({ ...entry, url: value });
  }
  // A network that is set but was not in the site file is added, after the ones that were.
  for (const { key, name } of SOCIAL_NETWORKS) {
    const value = set.get(key);
    if (value && !follow.some((entry) => entry.name === name)) icons.push({ name, url: value });
  }

  const blocks = (config.resources as { footerRelBlock?: FooterBlock[] }).footerRelBlock;
  const footer = blocks?.flatMap((block): FooterBlock[] => {
    if (block.title !== FOLLOW_COLUMN) return [block];
    const links = block.links.flatMap((link): FooterLink[] => {
      const value = setting(link.name);
      if (value === undefined) return [link];
      return value === '' ? [] : [{ ...link, url: value }];
    });
    return links.length ? [{ ...block, links }] : [];
  });

  return {
    ...config,
    site: { ...config.site, social: { ...config.site.social, follow: icons } },
    resources: footer ? { ...config.resources, footerRelBlock: footer } : config.resources,
  } as SiteConfig;
};

/** The config with the site settings from Supabase, when this build can read them. */
export const withSupabaseSiteSettings = async (
  config: SiteConfig,
  url: string | undefined,
  anonKey: string | undefined,
): Promise<SiteConfig> => {
  const rows = await fetchPublicRows('site_settings', 'key.asc', 'the site settings', url, anonKey);
  return rows ? withSiteSettings(config, rows) : config;
};
