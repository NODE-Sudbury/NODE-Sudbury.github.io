import { describe, expect, it } from 'vitest';
import { getProviderCompanyName, PROVIDER, supabaseProvider } from './providers';

describe('supabaseProvider', () => {
  it.each([
    [PROVIDER['https://accounts.google.com'], 'google'],
    [PROVIDER['google.com'], 'google'],
    [PROVIDER['https://www.facebook.com'], 'facebook'],
    [PROVIDER['facebook.com'], 'facebook'],
    [PROVIDER['https://twitter.com'], 'twitter'],
    [PROVIDER['twitter.com'], 'twitter'],
  ])('names %s %s for Supabase', (provider, name) => {
    expect(supabaseProvider(provider)).toBe(name);
  });

  it('refuses a provider it does not know', () => {
    expect(() => supabaseProvider('https://example.com' as PROVIDER)).toThrow('Unsupported provider');
  });
});

describe('getProviderCompanyName', () => {
  it('names the company behind each provider', () => {
    expect(getProviderCompanyName(PROVIDER['https://accounts.google.com'])).toBe('Google');
    expect(getProviderCompanyName(PROVIDER['facebook.com'])).toBe('Facebook');
    expect(getProviderCompanyName(PROVIDER['twitter.com'])).toBe('Twitter');
  });
});
