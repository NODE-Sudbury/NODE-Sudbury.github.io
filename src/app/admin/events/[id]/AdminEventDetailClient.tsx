'use client'

import { useState } from 'react'

type Event = {
  id: string
  title: string
  type: string
  status: string
  starts_at: string
  ends_at: string
}

type NavLink = {
  label: string
  href: string
}

type ManageLink = {
  label: string
  href: string
  description: string
  icon: string
  accent?: boolean
}

function ManageCard({ link }: { link: ManageLink }) {
  return (
    <a
      href={link.href}
      className="bg-[#13161f] border border-[#252b3a] rounded-lg p-4 hover:border-[#38bdf8] transition-all group flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">{link.icon}</span>
        <span className={`text-sm font-medium transition-colors ${link.accent ? 'text-[#38bdf8]' : 'text-[#e2e8f0] group-hover:text-[#38bdf8]'}`}>
          {link.label}
        </span>
      </div>
      <p className="text-xs text-[#8892a4] leading-snug">{link.description}</p>
    </a>
  )
}

function SectionHeading({ label }: { label: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8892a4] mb-3 mt-6 first:mt-0">
      {label}
    </h2>
  )
}

export default function AdminEventDetailClient({ event, navLinks }: { event: Event; navLinks: NavLink[] }) {
  const [awardStatus, setAwardStatus] = useState<null | { awarded: number; skipped: number }>(null)
  const [awardLoading, setAwardLoading] = useState(false)
  const [awardError, setAwardError] = useState<string | null>(null)

  async function handleAwardCertificates() {
    setAwardLoading(true)
    setAwardError(null)
    setAwardStatus(null)
    try {
      const res = await fetch(`/api/admin/events/${event.id}/award-certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (!res.ok) {
        setAwardError(json.error ?? 'Failed to award certificates')
      } else {
        setAwardStatus({ awarded: json.awarded, skipped: json.skipped })
      }
    } catch {
      setAwardError('Network error. Please try again.')
    } finally {
      setAwardLoading(false)
    }
  }

  const starts = new Date(event.starts_at).toLocaleString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const id = event.id
  const type = event.type

  // Core links - shown for all event types
  const coreLinks: ManageLink[] = [
    {
      label: 'Edit Event',
      href: `/admin/events/${id}/edit`,
      description: 'Update event details, dates, capacity, and post-event links.',
      icon: '✏️',
    },
    {
      label: 'Analytics',
      href: `/admin/events/${id}/analytics`,
      description: 'Attendance trends, registration funnel, and engagement stats.',
      icon: '📊',
    },
    {
      label: 'Registrations & Check-in',
      href: `/admin/events/${id}/registrations`,
      description: 'View registrations, manage attendance, and check in guests.',
      icon: '✅',
    },
    {
      label: 'Speakers',
      href: `/admin/events/${id}/speakers`,
      description: 'Add speakers, bios, and talk assignments for this event.',
      icon: '🎤',
    },
    {
      label: 'Logistics',
      href: `/admin/events/${id}/logistics`,
      description: 'Food, AV, volunteer notes, and on-site logistics details.',
      icon: '📦',
    },
    {
      label: 'Feedback',
      href: `/admin/events/${id}/feedback`,
      description: 'Review post-event survey responses and satisfaction scores.',
      icon: '💬',
    },
  ]

  // Rooms - available for all events (rooms page now exists)
  const roomsLink: ManageLink = {
    label: 'Rooms',
    href: `/admin/events/${id}/rooms`,
    description: 'Assign sessions and speakers to physical rooms or tracks.',
    icon: '🚪',
  }

  // Type-specific links
  const hackathonLinks: ManageLink[] = [
    {
      label: 'Hackathon Admin',
      href: `/admin/hackathon/${id}`,
      description: 'Teams, submissions, judging rounds, and bracket management.',
      icon: '⚡',
      accent: true,
    },
    roomsLink,
  ]

  const conferenceLinks: ManageLink[] = [
    {
      label: 'Schedule',
      href: `/admin/schedule/${id}`,
      description: 'Build and publish the full conference schedule and track layout.',
      icon: '🗓️',
      accent: true,
    },
    roomsLink,
  ]

  // Communication + global tools - shown for all types
  const toolLinks: ManageLink[] = [
    {
      label: 'Emails',
      href: '/admin/emails',
      description: 'Send announcements, reminders, and custom emails to attendees.',
      icon: '📧',
    },
    {
      label: 'Webhooks',
      href: '/admin/webhooks',
      description: 'Configure outbound webhooks triggered by event lifecycle actions.',
      icon: '🔗',
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      description: 'Global platform settings, integrations, and admin configuration.',
      icon: '⚙️',
    },
  ]

  const hasTypeSpecific = type === 'hackathon' || type === 'conference'

  // For types without a dedicated type-specific section, still show Rooms
  const standaloneRooms = !hasTypeSpecific

  return (
    <div className="min-h-screen bg-[#0d1117] py-10 px-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-[#8892a4] mb-3">
            <a href="/admin/events" className="hover:text-[#e2e8f0] transition-colors">Admin</a>
            <span>/</span>
            <span className="text-[#e2e8f0]">{event.title}</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-[#e2e8f0]">{event.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <TypeBadge type={type} />
                <StatusBadge status={event.status} />
                <span className="text-xs text-[#8892a4]">{starts}</span>
              </div>
            </div>
            <a
              href={`/admin/events/${id}/edit`}
              className="px-4 py-2 rounded-md border border-[#252b3a] text-sm text-[#8892a4] hover:text-white hover:border-[#38bdf8] transition-colors"
            >
              Edit Event
            </a>
          </div>
        </div>

        {/* Workshop certificate award panel */}
        {type === 'workshop' && (
          <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold text-[#e2e8f0] mb-1">Completion Certificates</h2>
                <p className="text-xs text-[#8892a4]">
                  Award completion certificates to all checked-in attendees of this workshop.
                </p>
              </div>
              <button
                onClick={handleAwardCertificates}
                disabled={awardLoading}
                className="px-5 py-2 rounded-md bg-[#38bdf8] text-black text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {awardLoading ? 'Awarding...' : 'Award Certificates'}
              </button>
            </div>
            {awardStatus && (
              <div className="mt-4 text-sm text-[#73daca] bg-[#0d2520] border border-[#1a4030] rounded-md px-4 py-2">
                {awardStatus.awarded} certificate{awardStatus.awarded !== 1 ? 's' : ''} issued
                {awardStatus.skipped > 0 && ` (${awardStatus.skipped} already had one)`}
              </div>
            )}
            {awardError && (
              <div className="mt-4 text-sm text-[#f7768e] bg-[#2a0d0d] border border-[#3a1010] rounded-md px-4 py-2">
                {awardError}
              </div>
            )}
          </div>
        )}

        {/* Manage section */}
        <div>
          <SectionHeading label="Manage" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coreLinks.map((link) => (
              <ManageCard key={link.href} link={link} />
            ))}
            {standaloneRooms && <ManageCard key="rooms" link={roomsLink} />}
          </div>

          {/* Type-specific section */}
          {type === 'hackathon' && (
            <>
              <SectionHeading label="Hackathon" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {hackathonLinks.map((link) => (
                  <ManageCard key={link.href} link={link} />
                ))}
              </div>
            </>
          )}

          {type === 'conference' && (
            <>
              <SectionHeading label="Conference" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {conferenceLinks.map((link) => (
                  <ManageCard key={link.href} link={link} />
                ))}
              </div>
            </>
          )}

          {/* Communication and tools */}
          <SectionHeading label="Communication & Tools" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {toolLinks.map((link) => (
              <ManageCard key={link.href} link={link} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    workshop: 'bg-[#0d2a3a] text-[#38bdf8] border-[#1a3a4a]',
    hackathon: 'bg-[#1a2a0e] text-[#9ece6a] border-[#2a4020]',
    meetup: 'bg-[#1a1a2a] text-[#bb9af7] border-[#2a2a4a]',
    conference: 'bg-[#2a1a0e] text-[#e0af68] border-[#3a2a10]',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${styles[type] ?? 'bg-[#1a2035] text-[#8892a4] border-[#252b3a]'}`}>
      {type}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: 'bg-[#1a2a10] text-[#9ece6a] border-[#2a4020]',
    draft: 'bg-[#1a1a1a] text-[#8892a4] border-[#252b3a]',
    cancelled: 'bg-[#1a0e0e] text-[#f7768e] border-[#3a1010]',
    archived: 'bg-[#0e0e1a] text-[#7aa2f7] border-[#1a2035]',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${styles[status] ?? 'bg-[#1a2035] text-[#8892a4] border-[#252b3a]'}`}>
      {status}
    </span>
  )
}
