/** The social networks whose links the admins set, by the key of their row in `site_settings`. */
export const SOCIAL_KEYS = [
  'social_x',
  'social_instagram',
  'social_facebook',
  'social_linkedin',
] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

/** N.O.D.E.'s social links, by network. An empty link is left out of the footer. */
export type SocialLinks = Record<SocialKey, string>;

export const EMPTY_SOCIAL_LINKS: SocialLinks = {
  social_x: '',
  social_instagram: '',
  social_facebook: '',
  social_linkedin: '',
};
