import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'NODE Event'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nodesudbury.com'
  const logoData = await fetch(new URL('/node-logo.png', baseUrl)).then(r => r.arrayBuffer())
  const logoSrc = 'data:image/png;base64,' + Buffer.from(logoData).toString('base64')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: event } = await supabase
    .from('events')
    .select('title, type, starts_at')
    .eq('slug', params.slug)
    .single()

  const title = event?.title ?? 'NODE Event'
  const date = event?.starts_at
    ? new Date(event.starts_at).toLocaleDateString('en-CA', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/Toronto',
      })
    : ''

  const TYPE_LABEL: Record<string, string> = {
    meetup: 'Meetup', workshop: 'Workshop', hackathon: 'Hackathon',
    conference: 'Conference', norcat_series: 'NORCAT Series',
    unconference: 'Unconference', study_group: 'Study Group',
    demo_day: 'Demo Day', game_jam: 'Game Jam', job_fair: 'Job Fair',
    competition_ctf: 'CTF Competition', async_event: 'Async Event',
  }
  const typeLabel = event?.type ? (TYPE_LABEL[event.type] ?? event.type) : ''

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0b1120',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={80} height={80} alt="NODE Sudbury" />
        </div>
        <div style={{ color: '#f8fafc', fontSize: 58, fontWeight: 800, lineHeight: 1.1, flex: 1 }}>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 24 }}>
          {typeLabel && (
            <div style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontSize: 18, padding: '6px 16px', borderRadius: 6 }}>
              {typeLabel}
            </div>
          )}
          {date && (
            <div style={{ color: '#94a3b8', fontSize: 22 }}>{date}</div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
