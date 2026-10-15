/** The two kinds of organization the admin dashboard keeps: who pays N.O.D.E., and who works with it. */
export type OrganizationKind = 'sponsor' | 'partner';

/** How much a sponsor gives, from the most to the least. */
export const SPONSOR_TIERS = ['platinum', 'gold', 'silver', 'bronze', 'community'] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];

/** A sponsor or a partner, as the `sponsors` and `partners` tables keep them. */
export interface Organization {
  id: string;
  kind: OrganizationKind;
  name: string;
  websiteUrl: string;
  /** Where the logo is inside its storage bucket, or empty without a logo. */
  logoPath: string;
  /** The logo's public address in storage, or empty without a logo. */
  logoUrl: string;
  /** Only sponsors have a tier. */
  tier: SponsorTier | undefined;
  sortOrder: number;
}

/** What the form on the add and edit page hands over to save. */
export interface OrganizationInput {
  /** Set when editing, and left out for a new organization. */
  id?: string;
  kind: OrganizationKind;
  name: string;
  websiteUrl: string;
  tier: SponsorTier | undefined;
  /** A new logo to upload. Without one, an existing logo stays. */
  logo?: File;
}
