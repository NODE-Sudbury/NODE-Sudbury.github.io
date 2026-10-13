export interface EventVenue {
  name?: string;
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
}

export interface EventTicket {
  title: string;
  /** In person, Online or Hybrid, when the provider says. */
  kind?: string;
  capacity?: number;
  claimed?: number;
}

/** An event from a GDG or Luma page, as written by `npm run sync:events`. */
export interface CommunityEvent {
  id: string;
  provider: 'gdg' | 'luma';
  /** The event's address on this site: /events/<slug>. */
  slug: string;
  category: string;
  title: string;
  summary?: string;
  description?: string;
  /** ISO dates with their offset. */
  start: string;
  end?: string;
  timezone?: string;
  online: boolean;
  venue?: EventVenue;
  host?: string;
  hostUrl?: string;
  /** The event's page on its provider. */
  url: string;
  /** Where people sign up: the same page. */
  rsvpUrl: string;
  /** A path on this site, saved by the sync. */
  image?: string;
  tags: string[];
  free?: boolean;
  format?: string;
  rsvpCount?: number;
  capacity?: number;
  tickets: EventTicket[];
}

export interface EventsData {
  generatedAt: string;
  /** The filters of the events page, in order. An event belongs to one. */
  categories: string[];
  events: CommunityEvent[];
}
