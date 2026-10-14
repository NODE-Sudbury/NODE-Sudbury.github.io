/** An organization NODE works with, as the `partners` table in Supabase keeps it. */
export interface AdminPartner {
  id: string;
  name: string;
  websiteUrl: string;
  /** The logo's address in the public `partner-logos` storage bucket, or empty without a logo. */
  logoUrl: string;
  sortOrder: number;
}
