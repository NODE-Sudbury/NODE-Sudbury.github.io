import { describe, expect, it } from 'vitest';
import type { CommunityEvent } from '../models/event';
import { eventDescription, shortTitle, splitEvents } from './events';

const event = (id: string, start: string, end?: string): CommunityEvent => ({
  id,
  provider: 'gdg',
  slug: id,
  category: 'Community Events',
  title: id,
  start,
  ...(end ? { end } : {}),
  online: false,
  url: `https://example.org/${id}`,
  rsvpUrl: `https://example.org/${id}`,
  tags: [],
  tickets: [],
});

describe('splitEvents', () => {
  const now = new Date('2026-10-13T12:00:00Z');

  it('puts events that have not ended in upcoming, soonest first', () => {
    const { upcoming } = splitEvents(
      [event('b', '2026-12-01T10:00:00Z'), event('a', '2026-11-01T10:00:00Z')],
      now,
    );
    expect(upcoming.map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('puts events that have ended in past, latest first', () => {
    const { past } = splitEvents(
      [event('a', '2026-08-01T10:00:00Z'), event('b', '2026-09-01T10:00:00Z')],
      now,
    );
    expect(past.map(({ id }) => id)).toEqual(['b', 'a']);
  });

  it('keeps an event that is under way as upcoming', () => {
    const { upcoming } = splitEvents(
      [event('a', '2026-10-13T10:00:00Z', '2026-10-13T18:00:00Z')],
      now,
    );
    expect(upcoming).toHaveLength(1);
  });
});

describe('shortTitle', () => {
  it('cuts a long title at its colon or dash', () => {
    expect(shortTitle('DevFest Sudbury 2026: Build, Secure, Scale – Developers')).toBe(
      'DevFest Sudbury 2026',
    );
    expect(shortTitle('Grok Bot Meetup - Sudbury')).toBe('Grok Bot Meetup');
  });

  it('keeps a title that has neither', () => {
    expect(shortTitle('Grok Bot Meetup Sudbury #1')).toBe('Grok Bot Meetup Sudbury #1');
  });
});

describe('eventDescription', () => {
  const base = event('a', '2026-11-28T13:30:00Z');

  it('leads with the date and place', () => {
    expect(
      eventDescription({
        ...base,
        timezone: 'America/Toronto',
        venue: { name: 'Collège Boréal' },
        summary: 'A day of talks.',
      }),
    ).toBe('November 28, 2026, Collège Boréal. A day of talks.');
  });

  it('says online for an online event and stays within 155 characters', () => {
    const text = eventDescription({ ...base, online: true, summary: 'x'.repeat(400) });

    expect(text.startsWith('November 28, 2026, online.')).toBe(true);
    expect(text.length).toBeLessThanOrEqual(155);
  });
});
