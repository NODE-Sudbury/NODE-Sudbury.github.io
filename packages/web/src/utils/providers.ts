import type { Provider } from '@supabase/supabase-js';

export enum PROVIDER {
  'https://accounts.google.com' = 'https://accounts.google.com',
  'google.com' = 'google.com',
  'https://www.facebook.com' = 'https://www.facebook.com',
  'facebook.com' = 'facebook.com',
  'https://twitter.com' = 'https://twitter.com',
  'twitter.com' = 'twitter.com',
}

/** The name Supabase gives the identity provider that site.json names by its address. */
export const supabaseProvider = (provider: PROVIDER): Provider => {
  switch (provider) {
    case PROVIDER['https://accounts.google.com']:
    case PROVIDER['google.com']:
      return 'google';

    case PROVIDER['https://www.facebook.com']:
    case PROVIDER['facebook.com']:
      return 'facebook';

    case PROVIDER['https://twitter.com']:
    case PROVIDER['twitter.com']:
      return 'twitter';

    default:
      throw new Error('Unsupported provider');
  }
};

export const getProviderCompanyName = (provider: PROVIDER) => {
  switch (supabaseProvider(provider)) {
    case 'google':
      return 'Google';
    case 'facebook':
      return 'Facebook';
    default:
      return 'Twitter';
  }
};
