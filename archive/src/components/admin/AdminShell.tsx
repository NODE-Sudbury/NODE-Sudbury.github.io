'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

type NavItem =
  | { type: 'link'; label: string; href: string }
  | { type: 'section'; label: string }
  | { type: 'divider' }

const NAV: NavItem[] = [
  // Primary - daily workflow
  { type: 'link',    label: 'Home',       href: '/admin' },
  { type: 'link',    label: 'Events',     href: '/admin/events' },
  { type: 'link',    label: 'Members',    href: '/admin/members' },
  { type: 'link',    label: 'Volunteers', href: '/admin/volunteers' },
  { type: 'link',    label: 'Sponsors',   href: '/admin/sponsors' },
  { type: 'link',    label: 'Emails',     href: '/admin/emails' },
  { type: 'link',    label: 'Analytics',  href: '/admin/analytics' },

  { type: 'divider' },

  // Content tools - occasional
  { type: 'section', label: 'Content' },
  { type: 'link',    label: 'Series',     href: '/admin/series' },
  { type: 'link',    label: 'CFP',        href: '/admin/cfp' },

  { type: 'section', label: 'Organization' },
  { type: 'link',    label: 'Chapters',   href: '/admin/chapters' },
  { type: 'link',    label: 'Team',       href: '/admin/team' },

  { type: 'section', label: 'Event Tools' },
  { type: 'link',    label: 'Scav Hunt',  href: '/admin/hunt' },
  { type: 'link',    label: 'Whiteboards', href: '/admin/whiteboard' },
  { type: 'link',    label: 'Quiz',       href: '/admin/quiz' },
  { type: 'link',    label: 'Gamification', href: '/admin/gamification' },

  { type: 'divider' },

  // Admin and settings - infrequent
  { type: 'section', label: 'Admin' },
  { type: 'link',    label: 'Promo Codes', href: '/admin/promo' },
  { type: 'link',    label: 'Templates',   href: '/admin/templates' },
  { type: 'link',    label: 'Moderation',  href: '/admin/moderation' },
  { type: 'link',    label: 'Audit Log',   href: '/admin/audit' },

  { type: 'section', label: 'Developer' },
  { type: 'link',    label: 'Webhooks',    href: '/admin/webhooks' },
  { type: 'link',    label: 'Embed Widget', href: '/embed' },

  { type: 'link',    label: 'Settings',    href: '/admin/settings' },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [member, setMember] = useState<any>(null)
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return
      supabase.from('members').select('id, full_name, avatar_url, email, role')
        .eq('id', data.session.user.id).single()
        .then(({ data: m }) => setMember(m))
    })
  }, [])

  const initials = member?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() ?? '?'

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</span>
            <span className="text-sm font-light tracking-wider text-muted-foreground"> Sudbury</span>
          </div>
          <span className="text-xs border border-border rounded px-1.5 py-0.5 text-muted-foreground">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View site
          </Link>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            My dashboard
          </Link>
          <Button
            variant="outline" size="sm"
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
            className="text-xs border-border hover:bg-muted"
          >
            Sign out
          </Button>
        </div>
      </div>

      <div className="flex flex-1 max-w-6xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-border flex flex-col py-6 px-3">
          <nav className="flex flex-col gap-0 flex-1">
            {NAV.map((item, i) => {
              if (item.type === 'divider') {
                return <div key={i} className="my-3 border-t border-border" />
              }
              if (item.type === 'section') {
                return (
                  <p key={i} className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    {item.label}
                  </p>
                )
              }
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {active && (
                    <span className="w-1 h-4 rounded-full bg-[#f0e6d3] mr-2.5 shrink-0" />
                  )}
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <Separator className="my-4" />

          {/* Current user identity */}
          {member && (
            <div className="flex items-center gap-2.5 px-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={member.avatar_url} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{member.full_name ?? member.email}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{member.role}</p>
              </div>
            </div>
          )}
        </aside>

        {/* Page content */}
        <main className="flex-1 py-8 px-8 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
