import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  breadcrumbStructuredData,
  eventListStructuredData,
  eventPageStructuredData,
  eventStructuredData,
  faqStructuredData,
  openGraphLocale,
  organizationStructuredData,
  personStructuredData,
  postStructuredData,
  projectStructuredData,
  serializeJsonLd,
  websiteStructuredData,
} from './structured-data';

const site = {
  url: 'https://fest.example/',
  image: 'https://fest.example/images/social-share.jpg',
  organizer: { name: 'GDG Example', url: 'https://gdg.example/' },
  event: {
    startDate: '2027-10-15',
    endDate: '2027-10-16',
    attendance: 'inPerson' as const,
    location: { name: 'Hall', address: '1 Main Street, City', city: 'City' },
  },
};
const resources = { title: 'Example Fest', description: 'A conference' };
const hall = {
  '@type': 'Place',
  name: 'Hall',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '1 Main Street, City',
    addressLocality: 'City',
  },
};
const stream = 'https://www.youtube.com/@example/live';

describe('eventStructuredData', () => {
  it('describes the event from the site config', () => {
    expect(eventStructuredData(site, resources)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: 'Example Fest',
      description: 'A conference',
      startDate: '2027-10-15',
      endDate: '2027-10-16',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: 'Hall',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '1 Main Street, City',
          addressLocality: 'City',
        },
      },
      image: ['https://fest.example/images/social-share.jpg'],
      url: 'https://fest.example/',
      organizer: { '@type': 'Organization', name: 'GDG Example', url: 'https://gdg.example/' },
    });
  });

  it('leaves out the organizer URL when the site has none', () => {
    const { organizer } = eventStructuredData(
      { ...site, organizer: { name: 'GDG Example' } },
      resources,
    );

    expect(organizer).toEqual({ '@type': 'Organization', name: 'GDG Example' });
  });

  it('places an online event at its stream, even with a venue in the config', () => {
    const data = eventStructuredData(
      { ...site, event: { ...site.event, attendance: 'online', stream } },
      resources,
    );

    expect(data.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode');
    expect(data.location).toEqual({ '@type': 'VirtualLocation', url: stream });
  });

  it('places a hybrid event at its venue and its stream', () => {
    const hybrid = (extra: { stream?: string }) =>
      eventStructuredData(
        { ...site, event: { ...site.event, attendance: 'hybrid', ...extra } },
        resources,
      );

    expect(hybrid({ stream }).eventAttendanceMode).toBe(
      'https://schema.org/MixedEventAttendanceMode',
    );
    expect(hybrid({ stream }).location).toEqual([
      hall,
      { '@type': 'VirtualLocation', url: stream },
    ]);
    expect(hybrid({}).location).toEqual(hall);
  });

  it('names no stream for an in-person event', () => {
    const { location } = eventStructuredData(
      { ...site, event: { ...site.event, stream } },
      resources,
    );

    expect(location).toEqual(hall);
  });
});

describe('serializeJsonLd', () => {
  it('escapes < so the data cannot end the script element', () => {
    const json = serializeJsonLd({ name: '</script><script>alert(1)</script>' });

    expect(json).not.toContain('<');
    expect(JSON.parse(json)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});

describe('openGraphLocale', () => {
  it('uses an underscore between language and region', () => {
    expect(openGraphLocale('pt-BR')).toBe('pt_BR');
    expect(openGraphLocale('en')).toBe('en');
  });
});

describe('organizationStructuredData', () => {
  const site = {
    url: 'https://nodesudbury.com/',
    organizer: {
      name: 'Northern Ontario Dev Exchange',
      legalName: 'Northern Ontario Dev Exchange',
      email: 'admin@nodesudbury.com',
      registrationNumber: 'OCN 1001716490',
      address: {
        streetAddress: '73 Elm St Ste 203',
        addressLocality: 'Sudbury',
        addressRegion: 'ON',
        postalCode: 'P3C 1R6',
        addressCountry: 'CA',
      },
    },
  };

  it('describes the organization with its address, registration number and profiles', () => {
    expect(
      organizationStructuredData(
        site,
        ['https://x.com/nodesudbury'],
        'https://nodesudbury.com/images/icon.png',
      ),
    ).toMatchObject({
      '@type': 'NGO',
      '@id': 'https://nodesudbury.com/#organization',
      identifier: 'OCN 1001716490',
      email: 'admin@nodesudbury.com',
      address: { '@type': 'PostalAddress', postalCode: 'P3C 1R6' },
      sameAs: ['https://x.com/nodesudbury'],
    });
  });

  it('leaves out what the site does not say', () => {
    const data = organizationStructuredData(
      { url: site.url, organizer: { name: 'NODE' } },
      [],
      'logo',
    );

    expect(data).not.toHaveProperty('address');
    expect(data).not.toHaveProperty('sameAs');
    expect(data).not.toHaveProperty('identifier');
  });
});

describe('websiteStructuredData', () => {
  it('points at the organization as its publisher', () => {
    expect(
      websiteStructuredData({ url: 'https://nodesudbury.com/' }, 'NODE', 'About').publisher,
    ).toEqual({
      '@id': 'https://nodesudbury.com/#organization',
    });
  });
});

describe('breadcrumbStructuredData', () => {
  it('numbers the trail and gives full addresses', () => {
    const { itemListElement } = breadcrumbStructuredData(
      [
        { name: 'Home', path: '/' },
        { name: 'Events', path: '/events' },
      ],
      'https://nodesudbury.com/',
    );

    expect(itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://nodesudbury.com/' },
      { '@type': 'ListItem', position: 2, name: 'Events', item: 'https://nodesudbury.com/events' },
    ]);
  });
});

describe('eventPageStructuredData', () => {
  const event = {
    title: 'DevFest Sudbury 2026',
    summary: 'A day of talks.',
    start: '2026-11-28T08:30:00-05:00',
    end: '2026-11-28T17:30:00-05:00',
    online: false,
    format: 'In person',
    venue: {
      name: 'Collège Boréal',
      address: '21 Lasalle Boulevard',
      city: 'Greater Sudbury',
      region: 'ON',
      postalCode: 'P3A 6B1',
    },
    host: 'GDG Sudbury',
    hostUrl: 'https://gdg.community.dev/gdg-sudbury/',
    url: 'https://gdg.community.dev/events/details/devfest/',
    rsvpUrl: 'https://gdg.community.dev/events/details/devfest/',
    free: true,
    capacity: 1000,
    tickets: [
      { title: 'In person', capacity: 350, claimed: 42 },
      { title: 'Online', capacity: 10, claimed: 10 },
    ],
  };
  const options = {
    pageUrl: 'https://nodesudbury.com/events/devfest',
    image: 'https://nodesudbury.com/a.png',
    organization: 'org',
  };

  it('describes when, where, who and the tickets', () => {
    expect(eventPageStructuredData(event, options)).toMatchObject({
      '@type': 'Event',
      name: 'DevFest Sudbury 2026',
      startDate: '2026-11-28T08:30:00-05:00',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: 'Collège Boréal', address: { postalCode: 'P3A 6B1' } },
      organizer: { name: 'GDG Sudbury' },
      maximumAttendeeCapacity: 1000,
    });
  });

  it('marks a full ticket as sold out and links every offer to the sign-up page', () => {
    const { offers } = eventPageStructuredData(event, options);

    expect(offers.map((offer) => offer.availability)).toEqual([
      'https://schema.org/InStock',
      'https://schema.org/SoldOut',
    ]);
    expect(offers.every((offer) => offer.url === event.rsvpUrl && offer.price === 0)).toBe(true);
  });

  it('gives an online event a virtual location, and a hybrid one both', () => {
    expect(
      eventPageStructuredData({ ...event, online: true, format: 'Online' }, options).location,
    ).toEqual({
      '@type': 'VirtualLocation',
      url: event.url,
    });
    const hybrid = eventPageStructuredData({ ...event, format: 'Hybrid' }, options);
    expect(hybrid.eventAttendanceMode).toBe('https://schema.org/MixedEventAttendanceMode');
    expect(hybrid.location).toHaveLength(2);
  });

  it('falls back to a plain registration offer and the organization when there are no tickets or host', () => {
    const data = eventPageStructuredData({ ...event, tickets: [], host: undefined }, options);

    expect(data.offers).toHaveLength(1);
    expect(data.organizer).toEqual({ '@id': 'org' });
  });
});

describe('eventListStructuredData', () => {
  it('lists the events with the address of each page', () => {
    expect(
      eventListStructuredData([{ title: 'A', slug: 'a' }], 'https://nodesudbury.com/')
        .itemListElement,
    ).toEqual([
      { '@type': 'ListItem', position: 1, name: 'A', url: 'https://nodesudbury.com/events/a' },
    ]);
  });
});

describe('postStructuredData and projectStructuredData', () => {
  it('describes a blog post', () => {
    expect(
      postStructuredData(
        { title: 'Hello', brief: 'Short', published: '2026-10-01' },
        { pageUrl: 'https://nodesudbury.com/blog/hello', organization: 'org' },
      ),
    ).toMatchObject({ '@type': 'BlogPosting', headline: 'Hello', datePublished: '2026-10-01' });
  });

  it('describes an open source project', () => {
    expect(
      projectStructuredData(
        {
          name: 'site',
          description: 'The site',
          url: 'https://github.com/NODE-Sudbury/site',
          language: 'TypeScript',
          createdAt: 'a',
          pushedAt: 'b',
        },
        { pageUrl: 'https://nodesudbury.com/open-source/site', organization: 'org' },
      ),
    ).toMatchObject({
      '@type': 'SoftwareSourceCode',
      codeRepository: 'https://github.com/NODE-Sudbury/site',
      programmingLanguage: 'TypeScript',
    });
  });
});

describe('absoluteUrl', () => {
  it('makes a path a full address', () => {
    expect(absoluteUrl('/images/a.png', 'https://nodesudbury.com/')).toBe(
      'https://nodesudbury.com/images/a.png',
    );
  });
});

describe('faqStructuredData', () => {
  const faq = [
    '## General',
    '',
    '### What is NODE?',
    '',
    'A **not-for-profit** in [Sudbury](https://nodesudbury.com).',
    '',
    '### What do we run?',
    '',
    '- Hackathons.',
    '- A speaker series.',
    '',
    '## Contact',
    '',
    '### How do I reach NODE?',
    '',
    'Email admin@nodesudbury.com.',
  ].join('\n');

  it('turns each question heading and the text under it into a question and answer', () => {
    const data = faqStructuredData(faq)!;

    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity.map(({ name }) => name)).toEqual([
      'What is NODE?',
      'What do we run?',
      'How do I reach NODE?',
    ]);
    expect(data.mainEntity[0]!.acceptedAnswer.text).toBe('A not-for-profit in Sudbury.');
    expect(data.mainEntity[1]!.acceptedAnswer.text).toBe('Hackathons. A speaker series.');
  });

  it('stops an answer at the next section heading', () => {
    const last = faqStructuredData(`### One\n\nFirst.\n\n## Next section\n\nNot part of it.`)!;

    expect(last.mainEntity[0]!.acceptedAnswer.text).toBe('First.');
  });

  it('has nothing to say about a page without questions', () => {
    expect(faqStructuredData('Just text.')).toBeUndefined();
  });
});

describe('personStructuredData', () => {
  const options = {
    pageUrl: 'https://nodesudbury.com/team/dean-lupini',
    image: 'https://nodesudbury.com/dean.jpg',
    organization: 'https://nodesudbury.com/#organization',
  };

  it('describes the person, their role and where they work', () => {
    expect(
      personStructuredData(
        { name: 'Dean Lupini', title: 'President', socials: [{ link: 'https://github.com/dean' }] },
        options,
      ),
    ).toMatchObject({
      '@type': 'Person',
      name: 'Dean Lupini',
      jobTitle: 'President',
      image: 'https://nodesudbury.com/dean.jpg',
      worksFor: { '@id': 'https://nodesudbury.com/#organization' },
      sameAs: ['https://github.com/dean'],
    });
  });

  it('leaves out profiles when there are none', () => {
    expect(
      personStructuredData({ name: 'A', title: 'B', socials: [] }, options),
    ).not.toHaveProperty('sameAs');
  });
});
