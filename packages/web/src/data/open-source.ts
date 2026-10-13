import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG_PATHS } from '../../build/resolve-config';
import type { OpenSourceData } from '../models/open-source';

/** The projects `npm run sync:github` saved in the site's content, or none before the first sync. */
export const loadOpenSource = (): OpenSourceData => {
  const file = join(CONFIG_PATHS.site, 'content', 'open-source.json');
  if (!existsSync(file)) return { org: '', generatedAt: '', projects: [] };
  return JSON.parse(readFileSync(file, 'utf8')) as OpenSourceData;
};
