export type BadgeDef = {
  slug: string
  name: string
  color: string
}

export const BADGE_DEFINITIONS: BadgeDef[] = [
  { slug: 'first_event',       name: 'First Event',       color: '#38bdf8' },
  { slug: 'first_speaker',     name: 'First Talk',        color: '#a78bfa' },
  { slug: 'hackathon_winner',  name: 'Hackathon Winner',  color: '#f59e0b' },
  { slug: 'volunteer',         name: 'Volunteer',         color: '#34d399' },
  { slug: 'streak_5',          name: '5-Event Streak',    color: '#fb923c' },
  { slug: 'norcat_alumni',     name: 'NORCAT Alumni',     color: '#f472b6' },
]

export const BADGE_MAP: Record<string, BadgeDef> = Object.fromEntries(
  BADGE_DEFINITIONS.map((b) => [b.slug, b])
)

export function badgeColor(slug: string): string {
  return BADGE_MAP[slug]?.color ?? '#8892a4'
}

export function badgeLabel(slug: string, name?: string): string {
  return BADGE_MAP[slug]?.name ?? name ?? slug
}
