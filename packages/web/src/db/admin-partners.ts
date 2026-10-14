import type { AdminPartner } from '../models/admin-partner';
import { getSupabase } from '../supabase';

type Row = Record<string, string | number | null>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** The bucket that holds the partners' logos. Anyone can read it, and only admins write to it. */
export const PARTNER_LOGO_BUCKET = 'partner-logos';

/** Every partner in the order the site lists them, with the address of each logo in storage. */
export const fetchAdminPartners = async (): Promise<AdminPartner[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('partners')
    .select('id, name, website_url, logo_path, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((row) => {
    const path = text(row['logo_path']);
    return {
      id: text(row['id']),
      name: text(row['name']),
      websiteUrl: text(row['website_url']),
      logoUrl: path
        ? supabase.storage.from(PARTNER_LOGO_BUCKET).getPublicUrl(path).data.publicUrl
        : '',
      sortOrder: typeof row['sort_order'] === 'number' ? row['sort_order'] : 0,
    };
  });
};
