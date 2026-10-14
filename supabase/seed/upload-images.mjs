// Puts the partner logos and the board photos in the storage buckets of a Supabase project.
//
//   SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_ANON_KEY=<the public anon key> \
//   ACCESS_TOKEN=<the super admin's access token> \
//   node supabase/seed/upload-images.mjs
//
// It acts as the super admin, so the same storage rules apply as in the dashboard: nothing here
// bypasses them, and the service role key is not needed. To get the access token, sign in to the
// site as the super admin, open the browser's developer tools, then Application, Local Storage, and
// copy `access_token` from the entry named `sb-<project>-auth-token`. It works for about an hour.
// Files that are already in storage are left alone.

import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const { SUPABASE_URL, SUPABASE_ANON_KEY, ACCESS_TOKEN } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ACCESS_TOKEN) {
  console.error('Set SUPABASE_URL, SUPABASE_ANON_KEY and ACCESS_TOKEN. See the top of this file.');
  process.exit(1);
}

const images = new URL('../../packages/config/public/images/node/', import.meta.url).pathname;
const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// The folder of each bucket's files in the repository. Placeholders for the sample site are skipped.
const BUCKETS = [
  { bucket: 'partner-logos', folder: 'partners', skip: ['your-logo-here.jpg'] },
  { bucket: 'board-photos', folder: 'team', skip: [] },
];

let failed = 0;
for (const { bucket, folder, skip } of BUCKETS) {
  const files = (await readdir(join(images, folder))).filter(
    (name) => extname(name) in TYPES && !skip.includes(name),
  );
  for (const name of files) {
    const body = await readFile(join(images, folder, name));
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${name}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': TYPES[extname(name)],
      },
      body,
    });
    const text = await response.text();
    if (response.ok) console.log(`uploaded  ${bucket}/${name}`);
    else if (/already exists|Duplicate/i.test(text))
      console.log(`kept      ${bucket}/${name} (already there)`);
    else {
      failed += 1;
      console.error(`FAILED    ${bucket}/${name}: ${response.status} ${text.slice(0, 120)}`);
    }
  }
}
process.exit(failed ? 1 : 0);
