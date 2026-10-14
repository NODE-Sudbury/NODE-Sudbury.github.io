'use client'

interface Event {
  id: string
  title: string
  slug: string
  type: string
  starts_at: string
  event_locations: { name: string } | null
}

interface CalendarWidgetProps {
  events: Event[]
  theme: 'dark' | 'light'
  appUrl: string
}

const TYPE_COLORS: Record<string, string> = {
  meetup: '#10b981',
  workshop: '#f59e0b',
  hackathon: '#a78bfa',
  conference: '#f97316',
  multi_track: '#38bdf8',
  norcat_series: '#ec4899',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return {
    month: d.toLocaleString('en-CA', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
    time: d.toLocaleString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true }),
  }
}

export function CalendarWidget({ events, theme, appUrl }: CalendarWidgetProps) {
  const dark = theme === 'dark'
  const bg = dark ? '#0b1120' : '#ffffff'
  const text = dark ? '#d8e3f0' : '#0f172a'
  const muted = dark ? '#6b7d96' : '#64748b'
  const border = dark ? '#1e2d45' : '#e2e8f0'
  const cardBg = dark ? '#111827' : '#f8fafc'

  if (events.length === 0) {
    return (
      <div style={{ background: bg, color: muted, padding: '24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
        No upcoming events.
        <br />
        <a href={appUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>
          Check nodesudbury.com
        </a>
      </div>
    )
  }

  return (
    <div style={{ background: bg, fontFamily: 'system-ui, sans-serif', padding: '12px', boxSizing: 'border-box', minHeight: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {events.map(ev => {
          const { month, day, time } = formatDate(ev.starts_at)
          const color = TYPE_COLORS[ev.type] ?? '#38bdf8'
          return (
            <div key={ev.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '10px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              {/* Date block */}
              <div style={{ flexShrink: 0, textAlign: 'center', width: '40px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color, letterSpacing: '0.08em' }}>{month}</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: text, lineHeight: 1 }}>{day}</div>
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color, background: `${color}18`, border: `1px solid ${color}40`, borderRadius: '4px', padding: '1px 6px' }}>
                    {ev.type.replace('_', ' ')}
                  </span>
                  {ev.event_locations && (
                    <span style={{ fontSize: '11px', color: muted }}>{ev.event_locations.name}</span>
                  )}
                  <span style={{ fontSize: '11px', color: muted }}>{time}</span>
                </div>
              </div>
              {/* Register link */}
              <a
                href={`${appUrl}/events/${ev.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#0b1120', background: '#38bdf8', padding: '4px 10px', borderRadius: '6px', textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                RSVP
              </a>
            </div>
          )
        })}
      </div>
      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px', color: muted }}>
        Powered by{' '}
        <a href={appUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>
          NODE Sudbury
        </a>
      </div>
    </div>
  )
}
