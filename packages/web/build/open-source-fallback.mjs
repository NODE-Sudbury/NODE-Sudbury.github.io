// Takes the open source data that the daily workflow published, when a build cannot read GitHub.
//
// A build asks GitHub for the data itself, but the builders of the host share addresses, and GitHub
// allows an address only 60 requests an hour without a token, so it often says no. The daily
// workflow reads GitHub with its own token and publishes the result on the `open-source-data`
// branch. This reads it from there, which has no such limit. The data is only taken when it is
// newer than what the build already has.

import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Where the published data is, for a repository such as `NODE-Sudbury/NODE-Sudbury.github.io`. */
export const publishedBase = (repository) =>
  `https://raw.githubusercontent.com/${repository}/open-source-data`;

const generatedAt = (path) => {
  try {
    return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')).generatedAt ?? '') : '';
  } catch {
    return '';
  }
};

/**
 * Copies the published data and the avatars it names into the build, when it is newer than what the
 * build has. `out` is the data file, and `imagesDir` the folder of avatars, whose files the data
 * names as `/images/github/<file>`. Returns whether anything was taken.
 */
export const takePublishedData = async ({
  base,
  out,
  imagesDir,
  fetchFn = fetch,
  warn = console.warn,
}) => {
  const response = await fetchFn(`${base}/open-source.json`);
  if (!response.ok) {
    warn(`No published open source data (${response.status}).`);
    return false;
  }
  const data = await response.json();
  if (!data || !Array.isArray(data.projects) || typeof data.generatedAt !== 'string') {
    warn('The published open source data is not in the expected shape.');
    return false;
  }
  if (data.generatedAt <= generatedAt(out)) return false;

  mkdirSync(imagesDir, { recursive: true });
  const avatars = new Set(
    data.projects.flatMap(({ contributors = [] }) =>
      contributors
        .map(({ avatar }) => avatar)
        .filter((avatar) => /^\/images\/github\/[\w.-]+$/.test(avatar ?? '')),
    ),
  );
  for (const avatar of avatars) {
    const file = avatar.slice('/images/github/'.length);
    const image = await fetchFn(`${base}/images/${file}`);
    // An avatar that cannot be fetched keeps its old file, if there is one.
    if (image.ok) writeFileSync(join(imagesDir, file), Buffer.from(await image.arrayBuffer()));
  }
  writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`);
  return true;
};
