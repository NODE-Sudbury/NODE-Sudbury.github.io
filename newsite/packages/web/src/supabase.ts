import { type SupabaseClient, createClient } from '@supabase/supabase-js';

const url = import.meta.env['PUBLIC_SUPABASE_URL'] as string | undefined;
const anonKey = import.meta.env['PUBLIC_SUPABASE_ANON_KEY'] as string | undefined;

/** Whether this build knows its Supabase project. Without one, sign-in is off. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | undefined;

/**
 * The browser's Supabase client, made on first use. Members sign in with a PKCE flow: the link in
 * the email or the return from Google carries a code, which the client trades for a session and
 * keeps in the browser's storage.
 */
export const getSupabase = (): SupabaseClient => {
  if (!url || !anonKey) throw new Error('Supabase is not configured for this build.');
  client ??= createClient(url, anonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return client;
};
