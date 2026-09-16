'use client'

import { useEffect, useState, useCallback } from 'react'

interface Attendee {
  id: string
  full_name: string
  avatar_url: string | null
  bio: string | null
  company: string | null
  title: string | null
  skills: string[]
  open_to_connect: boolean
}

interface DirectoryResponse {
  attendees: Attendee[]
  total: number
  event_ended: boolean
  directory_closes_at: string | null
  error?: string
}

const SKILLS_ALL = '__all__'

function SkillChip({ skill }: { skill: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 500,
        background: '#1a2035',
        color: '#7b93c8',
        border: '1px solid #252b3a',
        marginRight: '4px',
        marginBottom: '4px',
      }}
    >
      {skill}
    </span>
  )
}

function AttendeeCard({ attendee }: { attendee: Attendee }) {
  const initials = attendee.full_name
    ? attendee.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  return (
    <div
      style={{
        background: '#13172b',
        border: '1px solid #252b3a',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {attendee.avatar_url ? (
          <img
            src={attendee.avatar_url}
            alt={attendee.full_name}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #252b3a',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#1e2540',
              border: '2px solid #252b3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 700,
              color: '#7b93c8',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '15px',
              color: '#e8edf8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {attendee.full_name}
          </div>
          {(attendee.title || attendee.company) && (
            <div
              style={{
                fontSize: '12px',
                color: '#7b93c8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {[attendee.title, attendee.company].filter(Boolean).join(' at ')}
            </div>
          )}
        </div>
      </div>

      {attendee.open_to_connect && (
        <span
          style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            background: 'rgba(99, 195, 130, 0.12)',
            color: '#63c382',
            border: '1px solid rgba(99, 195, 130, 0.25)',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#63c382', display: 'inline-block' }} />
          Open to Connect
        </span>
      )}

      {attendee.bio && (
        <p
          style={{
            fontSize: '13px',
            color: '#8a9ab8',
            lineHeight: 1.5,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {attendee.bio}
        </p>
      )}

      {attendee.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '4px' }}>
          {attendee.skills.slice(0, 6).map((skill) => (
            <SkillChip key={skill} skill={skill} />
          ))}
          {attendee.skills.length > 6 && (
            <span style={{ fontSize: '11px', color: '#4a5880', alignSelf: 'center' }}>
              +{attendee.skills.length - 6} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function AttendeesPage({ params }: { params: { slug: string } }) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [gateExpired, setGateExpired] = useState(false)
  const [directoryClosesAt, setDirectoryClosesAt] = useState<string | null>(null)

  // Filter state
  const [search, setSearch] = useState('')
  const [skillFilter, setSkillFilter] = useState(SKILLS_ALL)
  const [openToConnectOnly, setOpenToConnectOnly] = useState(false)
  const [page, setPage] = useState(0)

  // Collect all unique skills from loaded attendees for the dropdown
  const [allSkills, setAllSkills] = useState<string[]>([])

  const fetchAttendees = useCallback(async () => {
    setLoading(true)
    try {
      const qp = new URLSearchParams()
      if (skillFilter !== SKILLS_ALL) qp.set('skill', skillFilter)
      if (openToConnectOnly) qp.set('open_to_connect', 'true')
      qp.set('page', String(page))
      qp.set('limit', '20')

      const res = await fetch(`/api/events/${params.slug}/attendees?${qp.toString()}`)

      if (res.status === 410) {
        setGateExpired(true)
        setLoading(false)
        return
      }

      if (!res.ok) {
        setLoading(false)
        return
      }

      const data: DirectoryResponse = await res.json()
      setAttendees(data.attendees)
      setTotal(data.total)
      setDirectoryClosesAt(data.directory_closes_at ?? null)

      // Build skill list from first page (page 0, no filters) only
      if (page === 0 && skillFilter === SKILLS_ALL && !openToConnectOnly) {
        const skills = new Set<string>()
        data.attendees.forEach((a) => a.skills.forEach((s) => skills.add(s)))
        setAllSkills(Array.from(skills).sort())
      }
    } catch {
      // Silently leave state as-is on network error
    } finally {
      setLoading(false)
    }
  }, [params.slug, skillFilter, openToConnectOnly, page])

  useEffect(() => {
    fetchAttendees()
  }, [fetchAttendees])

  // Client-side text search over loaded attendees
  const filtered = attendees.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.full_name?.toLowerCase().includes(q) ||
      a.company?.toLowerCase().includes(q) ||
      a.title?.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(total / 20)

  if (gateExpired) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0d0f17',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: 480,
            color: '#c9d1e8',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#e8edf8', marginBottom: '10px' }}>
            Directory no longer available
          </h2>
          <p style={{ fontSize: '14px', color: '#7b93c8', lineHeight: 1.6 }}>
            The attendee directory for this event was visible for 14 days after the event ended
            and is now closed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d0f17',
        color: '#c9d1e8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '32px 20px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#e8edf8', margin: 0 }}>
            Attendee Directory
          </h1>
          {total > 0 && !loading && (
            <p style={{ fontSize: '14px', color: '#7b93c8', marginTop: '6px' }}>
              {total} opted-in attendee{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Visibility banner */}
        <div
          style={{
            background: 'rgba(99, 145, 195, 0.1)',
            border: '1px solid rgba(99, 145, 195, 0.25)',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            color: '#7bafd4',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>&#9432;</span>
          <span>
            This directory is visible for 14 days after the event.
            {directoryClosesAt && (
              <> It closes on <strong style={{ color: '#a0bde0' }}>{new Date(directoryClosesAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.</>
            )}
          </span>
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '28px',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Search by name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: '1 1 220px',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #252b3a',
              background: '#13172b',
              color: '#c9d1e8',
              fontSize: '14px',
              outline: 'none',
            }}
          />

          <select
            value={skillFilter}
            onChange={(e) => { setSkillFilter(e.target.value); setPage(0) }}
            style={{
              flex: '0 0 auto',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #252b3a',
              background: '#13172b',
              color: '#c9d1e8',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value={SKILLS_ALL}>All skills</option>
            {allSkills.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#c9d1e8',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={openToConnectOnly}
              onChange={(e) => { setOpenToConnectOnly(e.target.checked); setPage(0) }}
              style={{ accentColor: '#63c382', width: 16, height: 16, cursor: 'pointer' }}
            />
            Open to Connect only
          </label>
        </div>

        {/* Grid */}
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '80px 0',
              color: '#4a5880',
              fontSize: '15px',
            }}
          >
            Loading attendees...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 0',
              color: '#4a5880',
              fontSize: '15px',
            }}
          >
            No attendees found matching your filters.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {filtered.map((attendee) => (
              <AttendeeCard key={attendee.id} attendee={attendee} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '36px',
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: '1px solid #252b3a',
                background: page === 0 ? '#0d0f17' : '#13172b',
                color: page === 0 ? '#3a4560' : '#c9d1e8',
                fontSize: '14px',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: '14px', color: '#7b93c8' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: '1px solid #252b3a',
                background: page >= totalPages - 1 ? '#0d0f17' : '#13172b',
                color: page >= totalPages - 1 ? '#3a4560' : '#c9d1e8',
                fontSize: '14px',
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
