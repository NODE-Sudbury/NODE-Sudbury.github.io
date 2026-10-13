import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG_PATHS } from '../../build/resolve-config';
import type { CommunityEvent, EventsData } from '../models/event';

/** The events `npm run sync:events` saved in the site's content, or none before the first sync. */
export const loadEvents = (): EventsData => {
  const file = join(CONFIG_PATHS.site, 'content', 'events.json');
  if (!existsSync(file)) return { generatedAt: '', events: [] };
  return JSON.parse(readFileSync(file, 'utf8')) as EventsData;
};

/** Events that have not ended yet, soonest first, and events that have, latest first. */
export const splitEvents = (events: CommunityEvent[], now = new Date()) => {
  const endsAt = (event: CommunityEvent) => new Date(event.end ?? event.start).getTime();
  return {
    upcoming: events.filter((event) => endsAt(event) >= now.getTime()).sort((a, b) => a.start.localeCompare(b.start)),
    past: events.filter((event) => endsAt(event) < now.getTime()).sort((a, b) => b.start.localeCompare(a.start)),
  };
};
