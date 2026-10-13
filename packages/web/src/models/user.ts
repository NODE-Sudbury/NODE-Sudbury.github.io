import type { User as SupabaseUser } from '@supabase/supabase-js';

export type { SupabaseUser };

/** The signed-in member, as the app shows them. */
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

/**
 * The member from a Supabase account. Google puts the name and photo in the account's metadata;
 * someone who signed in with an email link has only their address.
 */
export const toUser = (user: SupabaseUser): User => {
  const meta = user.user_metadata ?? {};
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: text(meta['full_name']) ?? text(meta['name']),
    photoURL: text(meta['avatar_url']) ?? text(meta['picture']),
  };
};
