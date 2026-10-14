import {
  type Organization,
  type OrganizationInput,
  type OrganizationKind,
  SPONSOR_TIERS,
} from '../models/organization';
import { getSupabase } from '../supabase';
import { logoExtension } from '../utils/organization';

type Row = Record<string, string | number | null>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Where each kind is kept: its table, and the public bucket that holds its logos. */
const WHERE = {
  sponsor: { table: 'sponsors', bucket: 'sponsor-logos' },
  partner: { table: 'partners', bucket: 'partner-logos' },
} as const satisfies Record<OrganizationKind, { table: string; bucket: string }>;

const COLUMNS = {
  sponsor: 'id, name, website_url, logo_path, tier, sort_order',
  partner: 'id, name, website_url, logo_path, sort_order',
} as const;

const toOrganization = (kind: OrganizationKind, row: Row): Organization => {
  const logoPath = text(row['logo_path']);
  const tier = SPONSOR_TIERS.find((known) => known === row['tier']);
  return {
    id: text(row['id']),
    kind,
    name: text(row['name']),
    websiteUrl: text(row['website_url']),
    logoPath,
    logoUrl: logoPath
      ? getSupabase().storage.from(WHERE[kind].bucket).getPublicUrl(logoPath).data.publicUrl
      : '',
    tier: kind === 'sponsor' ? (tier ?? 'community') : undefined,
    sortOrder: typeof row['sort_order'] === 'number' ? row['sort_order'] : 0,
  };
};

/** Every sponsor, or every partner, in the order the site lists them. */
export const fetchOrganizations = async (kind: OrganizationKind): Promise<Organization[]> => {
  const { data, error } = await getSupabase()
    .from(WHERE[kind].table)
    .select(COLUMNS[kind])
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map((row) => toOrganization(kind, row));
};

/** One sponsor or partner, or undefined when there is none with this id. */
export const fetchOrganization = async (
  kind: OrganizationKind,
  id: string,
): Promise<Organization | undefined> => {
  const { data, error } = await getSupabase()
    .from(WHERE[kind].table)
    .select(COLUMNS[kind])
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toOrganization(kind, data as unknown as Row) : undefined;
};

/** The sort order after the last one, so a new organization goes to the end of the list. */
const nextSortOrder = async (kind: OrganizationKind): Promise<number> => {
  const { data } = await getSupabase()
    .from(WHERE[kind].table)
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  const last = (data as Row[] | null)?.[0]?.['sort_order'];
  return typeof last === 'number' ? last + 1 : 0;
};

/**
 * Adds a sponsor or partner, or changes one that has an `id`. A new logo goes to storage first. If
 * the table then refuses the change, the new file is removed again, and when it works the old
 * logo is removed, so storage holds no file that nothing points to.
 */
export const saveOrganization = async (
  input: OrganizationInput,
  existing?: Organization,
): Promise<void> => {
  const supabase = getSupabase();
  const { table, bucket } = WHERE[input.kind];
  const id = input.id ?? crypto.randomUUID();
  let logoPath = existing?.logoPath ?? '';
  let uploaded = '';
  if (input.logo) {
    uploaded = `${id}-${Date.now().toString(36)}.${logoExtension(input.logo.type)}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(uploaded, input.logo, { contentType: input.logo.type });
    if (error) throw new Error(error.message);
    logoPath = uploaded;
  }
  const row: Record<string, string | number> = {
    name: input.name.trim(),
    website_url: input.websiteUrl,
    logo_path: logoPath,
  };
  if (input.kind === 'sponsor') row['tier'] = input.tier ?? 'community';
  const { error } = input.id
    ? await supabase.from(table).update(row).eq('id', input.id)
    : await supabase
        .from(table)
        .insert({ id, ...row, sort_order: await nextSortOrder(input.kind) });
  if (error) {
    if (uploaded) await supabase.storage.from(bucket).remove([uploaded]);
    throw new Error(error.message);
  }
  if (uploaded && existing?.logoPath) {
    await supabase.storage.from(bucket).remove([existing.logoPath]);
  }
};

/** Removes a sponsor or partner, and its logo from storage. */
export const deleteOrganization = async (organization: Organization): Promise<void> => {
  const supabase = getSupabase();
  const { table, bucket } = WHERE[organization.kind];
  const { error } = await supabase.from(table).delete().eq('id', organization.id);
  if (error) throw new Error(error.message);
  if (organization.logoPath) await supabase.storage.from(bucket).remove([organization.logoPath]);
};
