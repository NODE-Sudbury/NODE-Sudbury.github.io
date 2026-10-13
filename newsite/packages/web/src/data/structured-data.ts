interface Venue {
  name: string;
  address: string;
  city: string;
}

interface EventSite {
  url: string;
  image: string;
  organizer: { name: string; url?: string };
  event: {
    startDate: string;
    endDate: string;
    attendance: 'inPerson' | 'online' | 'hybrid';
    stream?: string;
    location?: Venue;
  };
}

interface EventResources {
  title: string;
  description: string;
}

const ATTENDANCE_MODES = {
  inPerson: 'https://schema.org/OfflineEventAttendanceMode',
  online: 'https://schema.org/OnlineEventAttendanceMode',
  hybrid: 'https://schema.org/MixedEventAttendanceMode',
};

/** The venue, the stream, or both for a hybrid event. */
const eventLocation = ({ attendance, stream, location }: EventSite['event']) => {
  const places = [
    attendance !== 'online' && location
      ? {
          '@type': 'Place',
          name: location.name,
          address: {
            '@type': 'PostalAddress',
            streetAddress: location.address,
            addressLocality: location.city,
          },
        }
      : undefined,
    attendance !== 'inPerson' && stream ? { '@type': 'VirtualLocation', url: stream } : undefined,
  ].filter((place) => place !== undefined);
  return places.length === 1 ? places[0] : places;
};

/** The event as schema.org JSON-LD, for search results. See https://developers.google.com/search/docs/appearance/structured-data/event */
export const eventStructuredData = (site: EventSite, resources: EventResources) => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: resources.title,
  description: resources.description,
  startDate: site.event.startDate,
  endDate: site.event.endDate,
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: ATTENDANCE_MODES[site.event.attendance],
  location: eventLocation(site.event),
  image: [site.image],
  url: site.url,
  organizer: {
    '@type': 'Organization',
    name: site.organizer.name,
    ...(site.organizer.url ? { url: site.organizer.url } : {}),
  },
});

/** JSON for a script element. `<` is escaped, so the data cannot end the element. */
export const serializeJsonLd = (data: object): string =>
  JSON.stringify(data).replaceAll('<', '\\u003c');

/** Open Graph wants `language_TERRITORY`, such as `pt_BR`. */
export const openGraphLocale = (locale: string): string => locale.replace('-', '_');

/** An address or path on the site as a full URL, for search results and social previews. */
export const absoluteUrl = (path: string, base: string): string => new URL(path, base).href;

interface OrganizationSite {
  url: string;
  icon?: string;
  organizer: {
    name: string;
    url?: string;
    email?: string;
    legalName?: string;
    registrationNumber?: string;
    address?: {
      streetAddress: string;
      addressLocality: string;
      addressRegion: string;
      postalCode: string;
      addressCountry: string;
    };
  };
}

/**
 * The organization as schema.org JSON-LD. Search engines use it for the knowledge panel, and the
 * links to its profiles help them tie the site to them. See
 * https://developers.google.com/search/docs/appearance/structured-data/organization
 */
export const organizationStructuredData = (
  site: OrganizationSite,
  profiles: readonly string[],
  logo: string,
) => ({
  '@context': 'https://schema.org',
  '@type': 'NGO',
  '@id': `${site.url}#organization`,
  name: site.organizer.name,
  ...(site.organizer.legalName ? { legalName: site.organizer.legalName } : {}),
  url: site.organizer.url ?? site.url,
  logo,
  ...(site.organizer.email ? { email: site.organizer.email } : {}),
  ...(site.organizer.registrationNumber ? { identifier: site.organizer.registrationNumber } : {}),
  ...(site.organizer.address
    ? { address: { '@type': 'PostalAddress', ...site.organizer.address } }
    : {}),
  ...(profiles.length ? { sameAs: [...profiles] } : {}),
});

/** The website as JSON-LD, tied to its organization. */
export const websiteStructuredData = (
  site: { url: string },
  name: string,
  description: string,
) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${site.url}#website`,
  url: site.url,
  name,
  description,
  publisher: { '@id': `${site.url}#organization` },
});

export interface Crumb {
  name: string;
  /** A path on the site, such as `/events`. */
  path: string;
}

/** The trail from the home page to a page, which search results show instead of the address. */
export const breadcrumbStructuredData = (crumbs: readonly Crumb[], base: string) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map(({ name, path }, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name,
    item: absoluteUrl(path, base),
  })),
});

interface EventLike {
  title: string;
  summary?: string | undefined;
  start: string;
  end?: string | undefined;
  online: boolean;
  format?: string | undefined;
  venue?:
    | { name?: string; address?: string; city?: string; region?: string; postalCode?: string }
    | undefined;
  host?: string | undefined;
  hostUrl?: string | undefined;
  url: string;
  rsvpUrl: string;
  image?: string | undefined;
  free?: boolean | undefined;
  capacity?: number | undefined;
  tickets: { title: string; capacity?: number | undefined; claimed?: number | undefined }[];
}

const attendanceMode = (event: Pick<EventLike, 'online' | 'format'>) =>
  event.format === 'Hybrid'
    ? ATTENDANCE_MODES.hybrid
    : event.online
      ? ATTENDANCE_MODES.online
      : ATTENDANCE_MODES.inPerson;

/**
 * One event as JSON-LD for rich results: when and where, who runs it, its tickets and where to sign
 * up. `pageUrl` is the event's page on this site. A page that has ended is still described, with
 * the dates, as Google asks. See
 * https://developers.google.com/search/docs/appearance/structured-data/event
 */
export const eventPageStructuredData = (
  event: EventLike,
  { pageUrl, image, organization }: { pageUrl: string; image?: string; organization: string },
) => {
  const place =
    event.venue && !event.online
      ? {
          '@type': 'Place',
          name: event.venue.name ?? event.venue.city ?? 'Venue',
          address: {
            '@type': 'PostalAddress',
            ...(event.venue.address ? { streetAddress: event.venue.address } : {}),
            ...(event.venue.city ? { addressLocality: event.venue.city } : {}),
            ...(event.venue.region ? { addressRegion: event.venue.region } : {}),
            ...(event.venue.postalCode ? { postalCode: event.venue.postalCode } : {}),
          },
        }
      : undefined;
  const location =
    event.format === 'Hybrid' && place
      ? [place, { '@type': 'VirtualLocation', url: event.url }]
      : (place ?? { '@type': 'VirtualLocation', url: event.url });
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${pageUrl}#event`,
    name: event.title,
    ...(event.summary ? { description: event.summary } : {}),
    startDate: event.start,
    ...(event.end ? { endDate: event.end } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: attendanceMode(event),
    location,
    ...(image ? { image: [image] } : {}),
    url: pageUrl,
    ...(event.capacity ? { maximumAttendeeCapacity: event.capacity } : {}),
    organizer: event.host
      ? {
          '@type': 'Organization',
          name: event.host,
          ...(event.hostUrl ? { url: event.hostUrl } : {}),
        }
      : { '@id': organization },
    offers: (event.tickets.length ? event.tickets : [{ title: 'Registration' }]).map((ticket) => ({
      '@type': 'Offer',
      name: ticket.title,
      url: event.rsvpUrl,
      price: event.free === false ? undefined : 0,
      priceCurrency: 'CAD',
      availability:
        ticket.capacity && (ticket.claimed ?? 0) >= ticket.capacity
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
    })),
  };
};

/** The upcoming events as a list, for the events page. */
export const eventListStructuredData = (
  events: readonly { title: string; slug: string }[],
  base: string,
) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: events.map(({ title, slug }, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: title,
    url: absoluteUrl(`/events/${slug}`, base),
  })),
});

/** A blog post as JSON-LD. */
export const postStructuredData = (
  post: { title: string; brief: string; published: string; image?: string | undefined },
  { pageUrl, image, organization }: { pageUrl: string; image?: string; organization: string },
) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.brief,
  datePublished: post.published,
  ...(image ? { image: [image] } : {}),
  mainEntityOfPage: pageUrl,
  url: pageUrl,
  author: { '@id': organization },
  publisher: { '@id': organization },
});

/** An open source project as JSON-LD. */
export const projectStructuredData = (
  project: {
    name: string;
    description: string;
    url: string;
    language?: string | undefined;
    license?: string | undefined;
    createdAt: string;
    pushedAt: string;
  },
  { pageUrl, organization }: { pageUrl: string; organization: string },
) => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareSourceCode',
  name: project.name,
  ...(project.description ? { description: project.description } : {}),
  codeRepository: project.url,
  ...(project.language ? { programmingLanguage: project.language } : {}),
  ...(project.license ? { license: project.license } : {}),
  dateCreated: project.createdAt,
  dateModified: project.pushedAt,
  url: pageUrl,
  author: { '@id': organization },
});
