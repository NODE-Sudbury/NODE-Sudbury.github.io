import { html, type TemplateResult } from 'lit';
import type { CommunityEvent } from '../../src/models/event';
import type { Member } from '../../src/models/member';
import type { Post } from '../../src/models/post';
import type { PreviousSpeaker } from '../../src/models/previous-speaker';
import type { Session } from '../../src/models/session';
import type { Speaker } from '../../src/models/speaker';
import type { Ticket } from '../../src/models/ticket';
import type { Content } from '../../src/store/content';
import type { ContentPresence } from '../../src/utils/content-presence';
import type { RouteLocation } from '../../src/utils/navigation';

/** A page that the Hydration project renders with Lit SSR, then hydrates in jsdom. */
export interface HydrationPage {
  content: Partial<Content>;
  /** Defines the page's elements. Pages import some blocks without waiting, so wait for them. */
  load: () => Promise<unknown>;
  template: () => TemplateResult;
  /** The query string the page loads with. Pages are built without one. */
  search?: string;
}

const speakers = ['ada', 'grace', 'alan', 'barbara', 'edsger'].map((id, index) => ({
  id,
  name: id,
  featured: index < 4,
  photoUrl: `https://example.com/${id}.jpg`,
  company: 'Example',
  companyLogoUrl: 'https://example.com/logo.svg',
  country: 'Ukraine',
  bio: `**${id}** builds things.`,
  socials: [{ icon: 'github', link: `https://github.com/${id}`, name: 'GitHub' }],
  badges: [{ name: 'gde', link: 'https://developers.google.com', description: 'GDE' }],
})) as never as Speaker[];

const previousSpeakers = Array.from({ length: 16 }, (_, index) => ({
  id: `previous-${index}`,
  name: `Previous ${index}`,
  photoUrl: `https://example.com/previous-${index}.jpg`,
  socials: [],
  sessions: {},
})) as never as PreviousSpeaker[];

const session = {
  id: 's1',
  title: 'Hydration',
  description: 'Matching **server** HTML.',
  day: '2026-10-08',
  startTime: '10:00',
  endTime: '11:00',
  speakers: ['ada'],
  tags: ['Web'],
} as never as Session;

const post = {
  id: 'hello',
  title: 'Hello',
  brief: 'The first post.',
  content: 'Hello **world**.',
  published: '2026-10-01',
  image: 'https://example.com/post.jpg',
} as never as Post;

const communityEvent: CommunityEvent = {
  id: 'gdg-1',
  provider: 'gdg',
  slug: 'devfest-sudbury',
  category: 'Community Events',
  title: 'DevFest Sudbury',
  summary: 'A day of talks.',
  start: '2026-11-28T08:30:00-05:00',
  end: '2026-11-28T17:30:00-05:00',
  timezone: 'America/Toronto',
  online: false,
  venue: { name: 'Collège Boréal', city: 'Greater Sudbury' },
  host: 'GDG Sudbury',
  url: 'https://gdg.community.dev/events/details/devfest/',
  rsvpUrl: 'https://gdg.community.dev/events/details/devfest/',
  tags: ['AI', 'DevFest'],
  rsvpCount: 44,
  tickets: [{ title: 'In person', capacity: 350, claimed: 42 }],
};

const boardMember: Member = {
  id: '0',
  parentId: '0',
  name: 'Dean Lupini',
  order: 0,
  photo: '',
  photoUrl: 'https://example.com/dean.jpg',
  socials: [{ icon: 'linkedin', link: 'https://linkedin.com/in/dean', name: 'LinkedIn' }],
  title: 'President',
};

const location: RouteLocation = {
  pathname: '/schedule/2026-10-08',
  search: '',
  params: { id: '2026-10-08' },
};

const ticket = {
  name: 'Regular',
  url: 'https://example.com/tickets',
  available: true,
  soldOut: false,
} as never as Ticket;

// A first edition, before any of its content is out.
const noContent: ContentPresence = {
  blog: false,
  gallery: false,
  partners: false,
  previousSpeakers: false,
  schedule: false,
  speakers: false,
  team: false,
  tickets: false,
  videos: false,
};

export const HYDRATION_PAGES: Record<string, HydrationPage> = {
  'header and footer': {
    content: { tickets: [] },
    load: () =>
      Promise.all([
        import('../../src/components/shell/app-header'),
        import('../../src/components/footer/footer-block'),
      ]),
    template: () =>
      html`<app-header .path=${'/speakers'}></app-header><footer-block></footer-block>`,
  },
  'header without content': {
    content: { tickets: [] },
    load: () => import('../../src/components/shell/app-header'),
    template: () => html`<app-header .path=${'/'} .presence=${noContent}></app-header>`,
  },
  'home page': {
    content: { blog: [post], speakers, tickets: [ticket] },
    load: () =>
      Promise.all([
        import('../../src/views/home-page'),
        import('../../src/components/home/latest-posts-block'),
        import('../../src/components/home/speakers-block'),
        import('../../src/components/home/subscribe-block'),
      ]),
    template: () => html`<home-page></home-page>`,
  },
  'home page without content': {
    content: { blog: [], speakers: [], tickets: [] },
    load: () =>
      Promise.all([
        import('../../src/views/home-page'),
        import('../../src/components/home/subscribe-block'),
      ]),
    template: () => html`<home-page .presence=${noContent}></home-page>`,
  },
  'speakers page without speakers': {
    content: { speakers: [], sessions: [], previousSpeakers: [] },
    load: () => import('../../src/views/speakers-page'),
    template: () => html`<speakers-page></speakers-page>`,
  },
  'schedule without sessions': {
    content: { sessions: [], speakers: [] },
    load: () =>
      Promise.all([
        import('../../src/views/schedule-page'),
        import('../../src/views/schedule/schedule-day'),
      ]),
    template: () =>
      html`<schedule-page .location=${location}
        ><schedule-day .location=${location}></schedule-day
      ></schedule-page>`,
  },
  'speakers page': {
    content: { speakers, sessions: [session], previousSpeakers },
    load: () => import('../../src/views/speakers-page'),
    template: () => html`<speakers-page></speakers-page>`,
  },
  'speakers page with a tag filter': {
    content: { speakers, sessions: [session], previousSpeakers },
    load: () => import('../../src/views/speakers-page'),
    template: () => html`<speakers-page></speakers-page>`,
    search: '?tags=Web',
  },
  'speaker page': {
    content: { speakers: speakers.slice(0, 1), sessions: [session], previousSpeakers },
    load: () => import('../../src/views/speaker-page'),
    template: () => html`<speaker-page .speakerId=${'ada'}></speaker-page>`,
  },
  'previous speakers page': {
    content: { previousSpeakers },
    load: () => import('../../src/views/previous-speakers-page'),
    template: () => html`<previous-speakers-page></previous-speakers-page>`,
  },
  'team page': {
    content: {
      teams: [{ id: 'core', title: 'Core team' }],
      members: [
        {
          id: 'ada',
          parentId: 'core',
          name: 'Ada',
          title: 'Organizer',
          order: 1,
          photo: '',
          photoUrl: 'https://example.com/ada.jpg',
          socials: [{ icon: 'github', link: 'https://github.com/ada', name: 'GitHub' }],
        },
      ],
    } as never,
    load: () => import('../../src/views/team-page'),
    template: () => html`<team-page></team-page>`,
  },
  'events page': {
    content: {},
    load: () => import('../../src/views/events-page'),
    template: () =>
      html`<events-page
        .upcoming=${[communityEvent]}
        .past=${[{ ...communityEvent, id: 'luma-1', slug: 'meetup', title: 'Meetup' }]}
        .categories=${['Hackathons', 'Community Events', 'Norcat Series']}
      ></events-page>`,
  },
  'event page': {
    content: {},
    load: () => import('../../src/views/event-page'),
    template: () => html`<event-page .event=${communityEvent}></event-page>`,
  },
  'board member page': {
    content: {},
    load: () => import('../../src/views/member-page'),
    template: () => html`<member-page .member=${boardMember}></member-page>`,
  },
  'account page': {
    content: {},
    load: () => import('../../src/views/account-page'),
    template: () => html`<account-page></account-page>`,
  },
  'public profile page': {
    content: {},
    load: () => import('../../src/views/public-profile-page'),
    template: () => html`<public-profile-page></public-profile-page>`,
  },
  'session page': {
    content: { sessions: [session], speakers: speakers.slice(0, 1) },
    load: () => import('../../src/views/session-page'),
    template: () => html`<session-page .sessionId=${'s1'}></session-page>`,
  },
  'schedule day': {
    content: { sessions: [session], speakers },
    load: () =>
      Promise.all([
        import('../../src/views/schedule-page'),
        import('../../src/views/schedule/schedule-day'),
      ]),
    template: () =>
      html`<schedule-page .location=${location}
        ><schedule-day .location=${location}></schedule-day
      ></schedule-page>`,
  },
  'blog post': {
    content: { blog: [post] },
    load: () => import('../../src/views/post-page'),
    template: () => html`<post-page .postId=${'hello'}></post-page>`,
  },
  'attending page': {
    content: {},
    load: () => import('../../src/views/attending-page'),
    template: () => html`<attending-page></attending-page>`,
  },
  'FAQ page': {
    content: {},
    load: () => import('../../src/views/faq-page'),
    template: () =>
      html`<faq-page .content=${'## Venue\n\nDetails.\n\n### Parking\n\nNearby.'}></faq-page>`,
  },
};
