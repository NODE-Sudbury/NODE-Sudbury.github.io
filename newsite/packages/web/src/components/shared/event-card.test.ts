import { fixture } from '../../../__tests__/helpers/fixtures';
import { html } from 'lit';
import { describe, expect, it } from 'vitest';
import type { CommunityEvent } from '../../models/event';
import { eventDate, eventPlace } from './event-card';
import './event-card';
import type { EventCard } from './event-card';

const event: CommunityEvent = {
  id: 'gdg-1',
  provider: 'gdg',
  slug: 'devfest-sudbury',
  category: 'Community Events',
  title: 'DevFest Sudbury',
  summary: 'A day of talks.',
  start: '2026-11-28T08:30:00-05:00',
  timezone: 'America/Toronto',
  online: false,
  venue: { name: 'Collège Boréal', city: 'Greater Sudbury' },
  host: 'GDG Sudbury',
  url: 'https://gdg.community.dev/events/details/devfest/',
  rsvpUrl: 'https://gdg.community.dev/events/details/devfest/',
  tags: ['AI', 'DevFest'],
  rsvpCount: 44,
  tickets: [],
};

describe('event-card', () => {
  it('shows the title, summary, tags and sign-up count', async () => {
    const card = await fixture<EventCard>(html`<event-card .event="${event}"></event-card>`);
    const text = card.shadowRoot!.textContent!;

    expect(text).toContain('DevFest Sudbury');
    expect(text).toContain('A day of talks.');
    expect(text).toContain('44 people signed up');
    expect([...card.shadowRoot!.querySelectorAll('hb-chip')].map((chip) => chip.textContent!.trim())).toEqual([
      'AI',
      'DevFest',
    ]);
  });

  it('shows only the tags the provider gives', async () => {
    const card = await fixture<EventCard>(
      html`<event-card .event="${{ ...event, tags: [] }}"></event-card>`,
    );

    expect(card.shadowRoot!.querySelector('hb-chip')).toBeNull();
  });
});

describe('eventDate', () => {
  it('shows the start in the event zone, or in the zone asked for', () => {
    expect(eventDate(event)).toContain('8:30');
    expect(eventDate(event, 'America/Vancouver')).toContain('5:30');
  });
});

describe('eventPlace', () => {
  it('names the venue, online, or both for a hybrid event', () => {
    expect(eventPlace({ ...(event.venue && { venue: event.venue }), online: false })).toBe('Collège Boréal, Greater Sudbury');
    expect(eventPlace({ online: true })).toBe('Online');
    expect(eventPlace({ ...(event.venue && { venue: event.venue }), online: false, format: 'Hybrid' })).toBe(
      'Collège Boréal, Greater Sudbury and online',
    );
  });
});
