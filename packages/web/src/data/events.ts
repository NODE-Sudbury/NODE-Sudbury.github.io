import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG_PATHS } from '../../build/resolve-config';
import type { CommunityEvent, EventsData } from '../models/event';

/** The events `npm run sync:events` saved in the site's content, or none before the first sync. */
export const loadEvents = (): EventsData => {
  const file = join(CONFIG_PATHS.site, 'content', 'events.json');
  if (!existsSync(file)) return { generatedAt: '', categories: [], events: [] };
  return JSON.parse(readFileSync(file, 'utf8')) as EventsData;
};

/** Events that have not ended yet, soonest first, and events that have, latest first. */
export const splitEvents = (events: CommunityEvent[], now = new Date()) => {
  const endsAt = (event: CommunityEvent) => new Date(event.end ?? event.start).getTime();
  return {
    upcoming: events
      .filter((event) => endsAt(event) >= now.getTime())
      .sort((a, b) => a.start.localeCompare(b.start)),
    past: events
      .filter((event) => endsAt(event) < now.getTime())
      .sort((a, b) => b.start.localeCompare(a.start)),
  };
};

/** The title up to a colon or dash: "DevFest Sudbury 2026: Build, Secure…" becomes "DevFest Sudbury 2026". */
export const shortTitle = (title: string): string =>
  title.split(/\s[:–—-]\s|:\s/)[0]?.trim() || title;

const clip = (value: string, length: number) => {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length <= length ? clean : `${clean.slice(0, length - 1).trimEnd()}…`;
};

/**
 * The meta description of an event: when and where, then what it is, within the 155 characters
 * search results show.
 */
export const eventDescription = (event: CommunityEvent): string => {
  const date = new Date(event.start).toLocaleDateString('en-CA', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: event.timezone,
  });
  const place = event.online ? 'online' : (event.venue?.name ?? event.venue?.city);
  const lead = [date, place].filter(Boolean).join(', ');
  return clip(event.summary ? `${lead}. ${event.summary}` : lead, 155);
};
