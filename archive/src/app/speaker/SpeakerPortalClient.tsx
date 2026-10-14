'use client'

import Link from 'next/link'

interface EventInfo {
  id: string
  title: string
  starts_at: string | null
  status: string | null
  slug: string | null
}

interface SpeakerAssignment {
  id: string
  member_id: string
  name: string | null
  bio: string | null
  photo_url: string | null
  talk_title: string | null
  talk_description: string | null
  session_type: string | null
  display_order: number | null
  events: EventInfo | null
}

interface Props {
  assignments: SpeakerAssignment[]
  userId: string
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Date TBD'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-CA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function statusBadge(status: string | null) {
  const s = (status ?? '').toLowerCase()
  if (s === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/40 border border-emerald-700/50 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
        Confirmed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/40 border border-amber-700/50 px-2.5 py-0.5 text-xs font-medium text-amber-400">
      Pending
    </span>
  )
}

export default function SpeakerPortalClient({ assignments }: Props) {
  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e2e8f0' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
            Speaker Portal
          </h1>
          <p style={{ color: '#8892a4', fontSize: 15 }}>
            Manage your speaker profile and session details for each event.
          </p>
        </div>

        {assignments.length === 0 ? (
          /* Empty state */
          <div style={{
            background: '#13161f',
            border: '1px solid #252b3a',
            borderRadius: 12,
            padding: '56px 32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎤</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
              No speaking assignments yet
            </h2>
            <p style={{ color: '#8892a4', fontSize: 14, maxWidth: 360, margin: '0 auto' }}>
              When you are added as a speaker to an event, it will appear here so you can fill in your bio, session details, and travel notes.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {assignments.map((a) => {
              const event = a.events
              return (
                <div
                  key={a.id}
                  style={{
                    background: '#13161f',
                    border: '1px solid #252b3a',
                    borderRadius: 12,
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {/* Event name + date row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16, color: '#e2e8f0', marginBottom: 4 }}>
                        {event?.title ?? 'Untitled Event'}
                      </div>
                      <div style={{ color: '#8892a4', fontSize: 13 }}>
                        {formatDate(event?.starts_at ?? null)}
                      </div>
                    </div>
                    {statusBadge(event?.status ?? null)}
                  </div>

                  {/* Session title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#8892a4', fontSize: 13 }}>Session:</span>
                    <span style={{ fontSize: 14, color: a.talk_title ? '#38bdf8' : '#4a5568' }}>
                      {a.talk_title ?? 'Session TBD'}
                    </span>
                  </div>

                  {/* Edit link */}
                  <div style={{ marginTop: 4 }}>
                    <Link
                      href={`/speaker/${a.id}`}
                      style={{
                        display: 'inline-block',
                        padding: '7px 18px',
                        borderRadius: 6,
                        background: '#38bdf8',
                        color: '#000',
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Edit Speaker Profile
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Back link */}
        <div style={{ marginTop: 40 }}>
          <Link
            href="/dashboard"
            style={{ color: '#8892a4', fontSize: 14, textDecoration: 'none' }}
          >
            &larr; Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
