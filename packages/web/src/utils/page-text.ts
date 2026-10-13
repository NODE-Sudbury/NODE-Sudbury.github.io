import { msg } from '@lit/localize';
import { navigationLabel } from '../components/shell/navigation-label';
import { attendingPage } from '../config/site';
import { getScheduleDay } from './dates';
import type { RouteLocation } from './navigation';

export type Page =
  | 'attending'
  | 'blog'
  | 'coc'
  | 'faq'
  | 'notFound'
  | 'offline'
  | 'openSource'
  | 'previousSpeakers'
  | 'schedule'
  | 'speakers'
  | 'team';

interface PageText {
  title: string;
  /** For the description meta tag. The visible hero description is site content. */
  metaDescription: string;
}

const PAGES: Record<Page, () => PageText> = {
  attending: () => ({
    title: msg('Attending', { id: 'pages.attending.title' }),
    metaDescription:
      attendingPage?.description ??
      msg('How to get to the event, and how to join online', {
        id: 'pages.attending.description',
      }),
  }),
  blog: () => ({
    title: msg('Blog', { id: 'pages.blog.title' }),
    metaDescription: msg(
      'News, event recaps and announcements from NODE, the Northern Ontario Dev Exchange in Sudbury.',
      { id: 'pages.blog.description' },
    ),
  }),
  coc: () => ({
    title: msg('Code of Conduct', { id: 'pages.coc.title' }),
    metaDescription: msg(
      'The NODE code of conduct: a harassment-free, inclusive experience at every event and online space, and how to report an incident.',
      { id: 'pages.coc.description' },
    ),
  }),
  faq: () => ({
    title: msg('FAQs', { id: 'pages.faq.title' }),
    metaDescription: msg(
      'Answers about NODE: who can join, what membership costs, our hackathons and speaker series, where events are held and how to reach us.',
      { id: 'pages.faq.description' },
    ),
  }),
  notFound: () => ({
    title: msg('Not Found', { id: 'pages.not-found.title' }),
    metaDescription: msg('Page not found', { id: 'pages.not-found.description' }),
  }),
  offline: () => ({
    title: msg('Offline', { id: 'pages.offline.title' }),
    metaDescription: msg('This page is not available offline', {
      id: 'pages.offline.description',
    }),
  }),
  openSource: () => ({
    title: msg('Open Source', { id: 'pages.open-source.title' }),
    metaDescription: msg(
      'Open source projects built by the NODE community in Sudbury. Browse the code, see who contributes and how active each project is.',
      {
        id: 'pages.open-source.description',
      },
    ),
  }),
  previousSpeakers: () => ({
    title: msg('Previous Speakers', { id: 'pages.previous-speakers.title' }),
    metaDescription: msg(
      'The speakers who have presented at NODE events across Northern Ontario.',
      {
        id: 'pages.previous-speakers.description',
      },
    ),
  }),
  schedule: () => ({
    title: msg('Events', { id: 'pages.schedule.title' }),
    metaDescription: msg(
      'Upcoming and past NODE events in Sudbury: hackathons, community meetups with GDG and Cursor, and the monthly speaker series at Norcat.',
      {
        id: 'pages.schedule.description',
      },
    ),
  }),
  speakers: () => ({
    title: msg('Speakers', { id: 'pages.speakers.title' }),
    metaDescription: msg(
      'Meet the developers, founders and employers speaking at the monthly NODE speaker series at the Norcat Innovation Hub in Sudbury.',
      { id: 'pages.speakers.description' },
    ),
  }),
  team: () => ({
    title: msg('Board', { id: 'pages.team.title' }),
    metaDescription: msg(
      'Meet the volunteer board of directors and volunteers of NODE, the Northern Ontario Dev Exchange not-for-profit in Sudbury.',
      { id: 'pages.team.description' },
    ),
  }),
};

/** A page's title and meta description in the current locale. Call it when rendering. */
export const pageText = (page: Page): PageText => PAGES[page]();

/** A page's title, after what it shows when that differs between pages, such as `October 13 | Schedule`. */
export const pageTitle = (page: Page, detail?: string): string =>
  detail ? `${detail} | ${pageText(page).title}` : pageText(page).title;

/** What a schedule page shows, for its title: a day or My Schedule. `/events` has none. */
export const scheduleDetail = ({ pathname, params }: RouteLocation): string | undefined => {
  if (pathname.endsWith('/my-schedule')) return navigationLabel('mySchedule');
  return params['id'] ? getScheduleDay(params['id']) : undefined;
};
