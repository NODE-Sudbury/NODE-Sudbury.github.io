import { describe, expect, it } from 'vitest';
import { findRisks } from '../../../.github/scripts/migration-guard.mjs';

const diffOf = (...lines: string[]) =>
  ['+++ b/supabase/migrations/1.sql', ...lines.map((line) => `+${line}`)].join('\n');

describe('migration guard', () => {
  it.each([
    ['drop table members;', 'drops an object'],
    ['TRUNCATE public.members;', 'truncates a table'],
    ['delete from public.members;', 'deletes rows without a where'],
    ["alter role authenticator set pgrst.db_max_rows = '1000';", 'changes a database role'],
    ['grant all on public.members to anon;', 'grants access to anon, public or the service role'],
    ['alter table x disable row level security;', 'turns off row level security'],
    [
      'create function f() returns int security definer as $$ $$;',
      'adds a function that runs with its owner rights',
    ],
    ['select vault.create_secret(1);', 'touches the vault or sends web requests'],
  ])('flags %s', (sql, reason) => {
    expect(findRisks(diffOf(sql))).toEqual([expect.objectContaining({ reason })]);
  });

  it('lets safe changes through', () => {
    const safe = diffOf(
      'create table public.notes (id uuid primary key);',
      'alter table public.notes enable row level security;',
      'grant select on public.notes to authenticated;',
      'delete from public.notes where id = 1;',
      '-- drop table is only a comment here',
    );
    expect(findRisks(safe)).toEqual([]);
  });

  it('names the file, and ignores lines that were not added', () => {
    const diff = ['+++ b/supabase/migrations/2.sql', '-drop table old;', '+drop table new;'].join(
      '\n',
    );
    expect(findRisks(diff)).toEqual([
      expect.objectContaining({ file: 'supabase/migrations/2.sql' }),
    ]);
  });
});
