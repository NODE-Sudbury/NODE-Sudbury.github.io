// Flags the lines a pull request adds to the database migrations that could wipe data or open the
// database up. CI runs it on every pull request. A maintainer who has read the change adds the label
// `migration-reviewed` to let it through.

import { execFileSync } from 'node:child_process';
import process from 'node:process';

const RULES = [
  [/\bdrop\s+(table|schema|database|column|view|function|extension)\b/i, 'drops an object'],
  [/\btruncate\b/i, 'truncates a table'],
  [/\bdelete\s+from\b(?![^;]*\bwhere\b)/i, 'deletes rows without a where'],
  [/\balter\s+(role|user)\b/i, 'changes a database role'],
  [/\bcreate\s+(role|user)\b/i, 'creates a database role'],
  [
    /\bgrant\b[^;]*\bto\b[^;]*\b(anon|public|service_role)\b/i,
    'grants access to anon, public or the service role',
  ],
  [/\bdisable\s+row\s+level\s+security\b/i, 'turns off row level security'],
  [/\bsecurity\s+definer\b/i, 'adds a function that runs with its owner rights'],
  [/\bvault\.|\bnet\.http/i, 'touches the vault or sends web requests'],
];

/** The findings in the added lines of a unified diff, as `{ file, line, text, reason }`. */
export const findRisks = (diff) => {
  const findings = [];
  let file = '';
  for (const line of diff.split('\n')) {
    const header = /^\+\+\+ b\/(.+)$/.exec(line);
    if (header) {
      file = header[1];
      continue;
    }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    const text = line.slice(1);
    if (/^\s*--/.test(text)) continue;
    for (const [pattern, reason] of RULES) {
      if (pattern.test(text)) findings.push({ file, text: text.trim(), reason });
    }
  }
  return findings;
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const base = process.env.BASE_SHA ?? 'origin/dev';
  const diff = execFileSync(
    'git',
    ['diff', '--unified=0', `${base}...HEAD`, '--', 'supabase/migrations', 'supabase/hotfixes'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const findings = findRisks(diff);
  const reviewed = (process.env.LABELS ?? '').split(',').includes('migration-reviewed');
  for (const { file, text, reason } of findings) {
    console.log(`::warning file=${file}::${reason}: ${text}`);
  }
  if (findings.length && !reviewed) {
    console.error(
      `${findings.length} risky line(s) in the migrations. A maintainer must read them and add the label "migration-reviewed".`,
    );
    process.exit(1);
  }
  console.log(findings.length ? 'Risky lines were reviewed.' : 'No risky lines in the migrations.');
}
