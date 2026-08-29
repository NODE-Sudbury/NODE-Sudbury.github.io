'use client'

import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { MyRSVPs } from '@/components/dashboard/MyRSVPs'
import { EditProfile } from '@/components/dashboard/EditProfile'
import { Card, CardContent } from '@/components/ui/card'

type Section = 'profile' | 'events'

const PLACEHOLDER_LINKS = [
  { label: 'Community', href: '#' },
  { label: 'Hackathons', href: '#' },
  { label: 'NORCAT Series', href: '#' },
  { label: 'Job Board', href: '#' },
  { label: 'Settings', href: '#' },
]

export default function Dashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [session, setSession] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<Section>('profile')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/auth/test'; return }
      setSession(data.session)
      fetchMember(data.session.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) { window.location.href = '/auth/test'; return }
      setSession(s)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchMember(userId: string) {
    const { data } = await supabase.from('members').select('*').eq('id', userId).single()
    setMember(data)
    setLoading(false)
  }

  const initials = member?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() ?? '?'
  const workLine = member?.member_type === 'professional'
    ? [member.job_title, member.company].filter(Boolean).join(' at ')
    : [member?.program, member?.school].filter(Boolean).join(', ')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</span>
          <span className="text-sm font-light tracking-wider text-muted-foreground"> Sudbury</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
          className="text-muted-foreground hover:text-foreground"
        >
          Sign out
        </Button>
      </div>

      <div className="flex max-w-5xl mx-auto min-h-[calc(100vh-49px)]">

        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-border flex flex-col py-6 px-3">

          {/* User identity */}
          <div className="flex flex-col items-center gap-2 pb-5 px-2">
            <Avatar className="h-12 w-12">
              <AvatarImage src={member?.avatar_url} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-sm font-semibold leading-tight">{member?.full_name ?? session?.user?.email}</p>
              {workLine && <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{workLine}</p>}
            </div>
            <Badge variant="outline" className="capitalize text-xs">{member?.member_type ?? 'member'}</Badge>
          </div>

          <Separator className="mb-4" />

          {/* Primary nav */}
          <nav className="flex flex-col gap-0.5 flex-1">
            <NavItem label="Profile" active={section === 'profile'} onClick={() => setSection('profile')} />
            <NavItem label="My Events" active={section === 'events'} onClick={() => setSection('events')} />

            <Separator className="my-3" />

            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1">Coming soon</p>
            {PLACEHOLDER_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="flex items-center justify-between px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                {l.label}
                <span className="text-[10px] border border-border rounded px-1 py-0.5 text-muted-foreground">soon</span>
              </a>
            ))}
          </nav>

          {/* Public profile link */}
          {member?.is_public && (
            <div className="mt-4 pt-4 border-t border-border">
              <a
                href={`/profile/${member.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#f0e6d3] hover:underline"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#f0e6d3] inline-block" />
                View public profile
              </a>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 py-8 px-8 overflow-y-auto">
          {section === 'profile' && (
            <ProfileSection
              supabase={supabase}
              member={member}
              initials={initials}
              onSave={(updated) => setMember(updated)}
            />
          )}
          {section === 'events' && (
            <EventsSection supabase={supabase} memberId={member?.id} />
          )}
        </main>
      </div>
    </div>
  )
}

function NavItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {active && <span className="w-1 h-4 rounded-full bg-[#f0e6d3] mr-2.5 shrink-0" />}
      {label}
    </button>
  )
}

function ProfileSection({ supabase, member, initials, onSave }: any) {
  return (
    <div className="space-y-8 max-w-xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your public information and preferences.</p>
      </div>

      {/* Public profile banner */}
      {member?.is_public && (
        <Card className="border-[#f0e6d3]/20 bg-[#f0e6d3]/5">
          <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#f0e6d3]">Public profile is on</p>
              <p className="text-xs text-muted-foreground mt-0.5">Visible to other members at NODE events for networking</p>
            </div>
            <a
              href={`/profile/${member.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#f0e6d3] hover:underline shrink-0 font-medium"
            >
              View →
            </a>
          </CardContent>
        </Card>
      )}

      {/* Edit profile (unified - shows current values + lets you edit) */}
      <EditProfile supabase={supabase} member={member} onSave={onSave} />
    </div>
  )
}

function EventsSection({ supabase, memberId }: any) {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold">My Events</h1>
        <p className="text-sm text-muted-foreground mt-1">Your RSVPs and upcoming NODE events.</p>
      </div>
      <MyRSVPs supabase={supabase} memberId={memberId} />
    </div>
  )
}
