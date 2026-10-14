import type { Partner } from '../models/partner';
import { SPONSOR_TIERS } from '../models/organization';
import type { Content } from '../store/content';
import { fetchPublicRows, type Row } from './public-rows';

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** The id of the group the sponsors are listed in, above the partners. */
export const SPONSORS_GROUP_ID = 'sponsors';

/** A partner or sponsor from its table, as the home page's partner block knows one. */
export const organizationToPartner = (
  row: Row,
  parentId: string,
  bucket: 'partner-logos' | 'sponsor-logos',
  supabaseUrl: string,
): Partner => {
  const logoPath = text(row['logo_path']);
  return {
    id: text(row['id']),
    parentId,
    name: text(row['name']),
    url: text(row['website_url']),
    order: typeof row['sort_order'] === 'number' ? row['sort_order'] : 0,
    logoUrl: logoPath ? `${supabaseUrl}/storage/v1/object/public/${bucket}/${logoPath}` : '',
  };
};

/** Sponsors by tier, the most generous first, and then in the order the admins gave. */
const bySponsorTier = (a: Row, b: Row): number => {
  const rank = (row: Row) => {
    const index = SPONSOR_TIERS.findIndex((tier) => tier === row['tier']);
    return index === -1 ? SPONSOR_TIERS.length : index;
  };
  const sort = (row: Row) => (typeof row['sort_order'] === 'number' ? row['sort_order'] : 0);
  return rank(a) - rank(b) || sort(a) - sort(b);
};

/**
 * The content with the partner logos taken from the tables the admins keep. The first group (the
 * community partners) gets the partners, and a group of sponsors goes above it when there are any.
 * The other groups, such as the call to become a partner, stay as they were. A logo is what the
 * block shows, so a partner or sponsor without one is left out. Without rows, or without groups to
 * put them in, the content stays as it was.
 */
export const withPartners = (
  content: Partial<Content>,
  partnerRows: Row[],
  sponsorRows: Row[],
  supabaseUrl: string,
): Partial<Content> => {
  const { partnerGroups, partners } = content;
  if (!partnerGroups?.length || !partners) return content;
  const [community] = [...partnerGroups].sort((a, b) => a.order - b.order);
  if (!community) return content;
  const withLogo = (partner: Partner) => partner.logoUrl !== '';
  const fromPartners = partnerRows
    .map((row) => organizationToPartner(row, community.id, 'partner-logos', supabaseUrl))
    .filter(withLogo);
  const fromSponsors = [...sponsorRows]
    .sort(bySponsorTier)
    .map((row, index) => ({
      ...organizationToPartner(row, SPONSORS_GROUP_ID, 'sponsor-logos', supabaseUrl),
      order: index,
    }))
    .filter(withLogo);
  if (!fromPartners.length && !fromSponsors.length) return content;
  const groups = fromSponsors.length
    ? [
        {
          id: SPONSORS_GROUP_ID,
          title: 'Sponsors',
          order: Math.min(...partnerGroups.map(({ order }) => order)) - 1,
        },
        ...partnerGroups,
      ]
    : partnerGroups;
  return {
    ...content,
    partnerGroups: groups,
    partners: [
      ...(fromPartners.length
        ? partners.filter(({ parentId }) => parentId !== community.id)
        : partners),
      ...fromPartners,
      ...fromSponsors,
    ],
  };
};

/** The content with the partners and sponsors from Supabase, when this build can read them. */
export const withSupabasePartners = async (
  content: Partial<Content>,
  url = import.meta.env['NEXT_PUBLIC_SUPABASE_URL'] as string | undefined,
  anonKey = import.meta.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] as string | undefined,
): Promise<Partial<Content>> => {
  const [partnerRows, sponsorRows] = await Promise.all([
    fetchPublicRows('partners', 'sort_order.asc,name.asc', 'the partners', url, anonKey),
    fetchPublicRows('sponsors', 'sort_order.asc,name.asc', 'the sponsors', url, anonKey),
  ]);
  if (!url || (!partnerRows && !sponsorRows)) return content;
  return withPartners(content, partnerRows ?? [], sponsorRows ?? [], url);
};
