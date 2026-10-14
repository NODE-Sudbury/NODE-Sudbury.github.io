import {
  EMPTY_SOCIAL_LINKS,
  SOCIAL_KEYS,
  type SocialKey,
  type SocialLinks,
} from '../models/site-settings';
import { getSupabase } from '../supabase';

type Row = Record<string, unknown>;

const isSocialKey = (key: unknown): key is SocialKey => SOCIAL_KEYS.some((known) => known === key);

/** NODE's social links as they are saved. A network with no row yet has an empty link. */
export const fetchSocialLinks = async (): Promise<SocialLinks> => {
  const { data, error } = await getSupabase().from('site_settings').select('key, value');
  if (error) throw new Error(error.message);
  const links = { ...EMPTY_SOCIAL_LINKS };
  for (const row of (data ?? []) as Row[]) {
    if (isSocialKey(row['key']) && typeof row['value'] === 'string')
      links[row['key']] = row['value'];
  }
  return links;
};

/**
 * Saves all four links. A cleared link is saved as empty, which hides it from the footer, rather
 * than deleted, so a network that was set on purpose to nothing stays that way.
 */
export const saveSocialLinks = async (links: SocialLinks): Promise<void> => {
  const { error } = await getSupabase()
    .from('site_settings')
    .upsert(
      SOCIAL_KEYS.map((key) => ({ key, value: links[key] })),
      { onConflict: 'key' },
    );
  if (error) throw new Error(error.message);
};
