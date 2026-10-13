import type { User as SupabaseUser } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { toUser } from './user';

const account = (meta: Record<string, unknown>, email: string | null = 'ada@example.com') =>
  ({ id: 'user-1', ...(email ? { email } : {}), user_metadata: meta }) as unknown as SupabaseUser;

describe('toUser', () => {
  it('takes the name and photo Google puts in the account', () => {
    expect(
      toUser(account({ full_name: 'Ada Lovelace', avatar_url: 'https://example.com/ada.jpg' })),
    ).toStrictEqual({
      uid: 'user-1',
      email: 'ada@example.com',
      displayName: 'Ada Lovelace',
      photoURL: 'https://example.com/ada.jpg',
    });
  });

  it('falls back to the other names providers use', () => {
    expect(toUser(account({ name: 'Ada', picture: 'https://example.com/p.jpg' }))).toMatchObject({
      displayName: 'Ada',
      photoURL: 'https://example.com/p.jpg',
    });
  });

  it('has only the address for someone who signed in with an email link', () => {
    expect(toUser(account({}))).toStrictEqual({
      uid: 'user-1',
      email: 'ada@example.com',
      displayName: null,
      photoURL: null,
    });
  });

  it('ignores blank names and a missing address', () => {
    expect(toUser(account({ full_name: '  ' }, null))).toMatchObject({
      email: null,
      displayName: null,
    });
  });
});
