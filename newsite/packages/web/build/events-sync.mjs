// Writes packages/config/content/events.json from the event pages listed in
// packages/config/content/event-sources.json. Two providers are understood:
//   gdg  - a gdg.community.dev event page: details, venue, ticket types and the RSVP count
//   luma - a luma.com event page: details, venue, hosts and the guest count
// Only public information is read, with no login. Add an event by adding its link to the sources.
// Run it with `npm --prefix packages/web run sync:events`. `--if-requested` (used by the build)
// does nothing unless SYNC_EVENTS=1. When a page can't be reached, that event's last saved data stays.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SOURCES = fileURLToPath(new URL('../../config/content/event-sources.json', import.meta.url));
const OUT = fileURLToPath(new URL('../../config/content/events.json', import.meta.url));
const IMAGES = fileURLToPath(new URL('../../config/public/images/events/', import.meta.url));
const AGENT = 'Mozilla/5.0 (compatible; node-sudbury-site-sync)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Both services answer 429 when asked too fast, so a request waits and tries again.
const fetchJson = async (url, attempts = 4) => {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': AGENT } });
    if (response.status === 429 && attempt < attempts) {
      await sleep(attempt * 15000);
      continue;
    }
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    return response.json();
  }
  throw new Error(`${url} kept answering 429`);
};

const text = (html = '') =>
  html
    .replace(/<\/(p|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Luma writes descriptions as a rich-text tree: paragraphs and lists of text.
const treeText = (node) => {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hard_break') return '\n';
  const inner = (node.content ?? []).map(treeText).join('');
  return ['paragraph', 'heading', 'list_item', 'bullet_list', 'ordered_list'].includes(node.type) ? `${inner}\n` : inner;
};

const clip = (value, length) => {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length <= length ? clean : `${clean.slice(0, length - 1).trimEnd()}…`;
};

const GDG_KIND = { IN_PERSON: 'In person', VIRTUAL: 'Online', HYBRID: 'Hybrid' };

const gdg = async ({ url, category }) => {
  const slug = new URL(url).pathname.split('/').filter(Boolean).at(-1);
  const base = `https://gdg.community.dev/api`;
  const event = await fetchJson(`${base}/event_slim/${slug}/`);
  const tickets = await fetchJson(`${base}/event/${slug}/ticket/`).catch(() => ({ results: [] }));
  const count = await fetchJson(`${base}/event/${slug}/attendee/count/`).catch(() => undefined);
  const details = event.url ?? url;
  return {
    id: `gdg-${event.id}`,
    provider: 'gdg',
    category,
    title: event.title,
    summary: event.description_short || clip(text(event.description), 220),
    description: text(event.description),
    start: event.start_date_iso,
    end: event.end_date_iso,
    timezone: event.event_timezone,
    online: Boolean(event.is_virtual_event),
    venue: event.venue_name
      ? {
          name: event.venue_name,
          address: event.venue_address,
          city: event.venue_city,
          region: event.venue_state,
          postalCode: event.venue_zip_code,
        }
      : undefined,
    host: event.chapter_title,
    hostUrl: event.chapter_url,
    url: details,
    rsvpUrl: details,
    image: event.event_banner || event.picture || undefined,
    tags: event.tags ?? [],
    free: event.event_type_title ? /free/i.test(event.event_type_title) : undefined,
    format: GDG_KIND[event.audience_type],
    rsvpCount: count?.attendee_count ?? event.total_attendees,
    capacity: event.total_capacity || undefined,
    tickets: (tickets.results ?? [])
      .filter((ticket) => ticket.visible)
      .map((ticket) => ({
        title: ticket.title,
        kind: GDG_KIND[ticket.audience_type],
        capacity: ticket.total_count,
        claimed: ticket.quantity_claimed,
      })),
  };
};

const luma = async ({ url, category }) => {
  const slug = new URL(url).pathname.split('/').filter(Boolean).at(-1);
  const body = await fetchJson(`https://api2.luma.com/url?url=${encodeURIComponent(slug)}`);
  const data = body.data ?? {};
  const event = data.event ?? {};
  const place = event.geo_address_info ?? {};
  const hosts = (data.hosts ?? []).map((host) => host.name).filter(Boolean);
  const tickets = (data.ticket_types ?? []).map((ticket) => ({
    title: ticket.name,
    capacity: ticket.max_capacity ?? undefined,
  }));
  const online = event.location_type === 'online';
  const description = treeText(data.description_mirror).replace(/\n{3,}/g, '\n\n').trim();
  return {
    id: `luma-${event.api_id ?? slug}`,
    provider: 'luma',
    category,
    title: event.name,
    summary: clip(description, 220) || undefined,
    description: description || undefined,
    start: event.start_at,
    end: event.end_at,
    timezone: event.timezone,
    online,
    venue: online
      ? undefined
      : {
          name: place.address ?? event.geo_address_json?.address,
          address: place.full_address,
          city: place.city,
          region: place.region,
        },
    host: hosts.join(', ') || undefined,
    url: `https://luma.com/${event.url ?? slug}`,
    rsvpUrl: `https://luma.com/${event.url ?? slug}`,
    image: event.cover_url || undefined,
    tags: (data.categories ?? []).map((category) => category.name).filter(Boolean),
    free: tickets.length ? undefined : true,
    format: online ? 'Online' : 'In person',
    rsvpCount: data.guest_count ?? event.guest_count ?? undefined,
    capacity: event.max_capacity ?? undefined,
    tickets,
  };
};

// Saves a cover image on this site, so visitors never load it from another service.
const saveImage = async (id, url) => {
  if (!url) return undefined;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': AGENT } });
    if (!response.ok) return url;
    const type = response.headers.get('content-type') ?? '';
    const extension = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg';
    mkdirSync(IMAGES, { recursive: true });
    writeFileSync(`${IMAGES}${id}.${extension}`, Buffer.from(await response.arrayBuffer()));
    return `/images/events/${id}.${extension}`;
  } catch {
    return url;
  }
};

const PROVIDERS = { gdg, luma };

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);

const main = async () => {
  const { sources } = readJson(SOURCES, { sources: [] });
  const previous = readJson(OUT, { events: [] }).events;
  const events = [];
  for (const source of sources) {
    const provider = PROVIDERS[source.provider];
    if (!provider) {
      console.warn(`Unknown provider "${source.provider}" for ${source.url}`);
      continue;
    }
    console.log(`- ${source.provider}: ${source.url}`);
    try {
      const event = await provider(source);
      events.push({ ...event, image: await saveImage(event.id, event.image) });
    } catch (error) {
      console.warn(`  ${error.message}`);
      const kept = previous.find((event) => event.url === source.url || event.rsvpUrl === source.url);
      if (kept) {
        console.warn('  Keeping the last saved data for this event.');
        events.push(kept);
      }
    }
  }
  events.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));
  writeFileSync(OUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), events }, null, 2)}\n`);
  console.log(`Wrote ${events.length} event(s) to packages/config/content/events.json`);
};

if (process.argv.includes('--if-requested') && process.env.SYNC_EVENTS !== '1') {
  console.log('Event sync skipped. Set SYNC_EVENTS=1 to refresh the events before a build.');
} else {
  main().catch((error) => {
    console.error(error.message);
    process.exit(process.argv.includes('--if-requested') ? 0 : 1);
  });
}
