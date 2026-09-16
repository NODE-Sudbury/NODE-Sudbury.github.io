'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface Props {
  eventId: string
  eventType: string
  hasStream?: boolean
}

export default function AdminEventTabNav({ eventId, eventType, hasStream }: Props) {
  const pathname = usePathname()
  const base = `/admin/events/${eventId}`

  // path: sub-path under base (e.g. '/edit'); href: full override for external admin routes
  const tabs: { label: string; path: string; href?: string; always: boolean }[] = [
    { label: 'Overview',      path: '',              always: true },
    { label: 'Details',       path: '/edit',          always: true },
    { label: 'People',        path: '/speakers',      always: true },
    { label: 'Registrations', path: '/registrations', always: true },
    { label: 'Logistics',     path: '/logistics',     always: true },
    { label: 'Tiers',         path: '/tiers',         always: true },
    { label: 'Feedback',      path: '/feedback',      always: true },
    { label: 'Analytics',     path: '/analytics',     always: true },
    { label: 'Streaming',     path: '/streaming',     always: !!hasStream },
    { label: 'Hackathon',     path: '',  href: `/admin/hackathon/${eventId}`, always: eventType === 'hackathon' },
    { label: 'Schedule',      path: '',  href: `/admin/schedule/${eventId}`,  always: eventType === 'conference' },
  ].filter(t => t.always)

  const subPath = pathname.startsWith(base) ? pathname.slice(base.length).split('?')[0] : ''

  return (
    <div className="border-b border-[#252b3a] bg-[#0d1117]">
      <div className="max-w-6xl mx-auto px-6 flex items-center gap-0 overflow-x-auto">
        {tabs.map(tab => {
          const href = tab.href ?? `${base}${tab.path}`

          // External tabs (href override) are only active when the full pathname matches
          const isActive = tab.href
            ? pathname.startsWith(tab.href)
            : tab.path === ''
              ? subPath === '' || subPath === '/'
              : subPath === tab.path || subPath.startsWith(tab.path + '/')

          return (
            <Link
              key={href}
              href={href}
              className={[
                'shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-[#38bdf8] text-[#38bdf8]'
                  : 'border-transparent text-[#8892a4] hover:text-[#c9d1e8]',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
