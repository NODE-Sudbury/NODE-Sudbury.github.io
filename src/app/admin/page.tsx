'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface Stats {
  totalMembers: number
  newMembersThisMonth: number
  upcomingEvents: number
  rsvpsThisMonth: number
  totalRsvps: number
}

export default function AdminHome() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [stats, setStats] = useState<Stats | null>(null)
  const [upcomingEvent, setUpcomingEvent] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        { count: totalMembers },
        { count: newMembersThisMonth },
        { count: upcomingEvents },
        { count: rsvpsThisMonth },
        { count: totalRsvps },
        { data: nextEvent },
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('starts_at', now.toISOString()),
        supabase.from('rsvps').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('rsvps').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('id, title, starts_at, capacity')
          .gte('starts_at', now.toISOString()).order('starts_at').limit(1).single(),
      ])

      setStats({
        totalMembers: totalMembers ?? 0,
        newMembersThisMonth: newMembersThisMonth ?? 0,
        upcomingEvents: upcomingEvents ?? 0,
        rsvpsThisMonth: rsvpsThisMonth ?? 0,
        totalRsvps: totalRsvps ?? 0,
      })
      setUpcomingEvent(nextEvent)
    }
    load()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">NODE Sudbury at a glance.</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Total members" value={stats?.totalMembers} />
        <StatTile label="New this month" value={stats?.newMembersThisMonth} />
        <StatTile label="Upcoming events" value={stats?.upcomingEvents} />
        <StatTile label="RSVPs this month" value={stats?.rsvpsThisMonth} />
        <StatTile label="Total RSVPs" value={stats?.totalRsvps} />
      </div>

      {/* Next event */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Next event</h2>
        {upcomingEvent ? (
          <Card>
            <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">{upcomingEvent.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(upcomingEvent.starts_at).toLocaleDateString('en-CA', {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                  })}
                  {upcomingEvent.capacity && ` - capacity ${upcomingEvent.capacity}`}
                </p>
              </div>
              <Link
                href={`/admin/events`}
                className="text-xs text-[#f0e6d3] hover:underline shrink-0"
              >
                Manage →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-4 px-5">
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
              <Link href="/admin/events" className="text-xs text-[#f0e6d3] hover:underline mt-1 inline-block">
                Create one →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 px-5">
        <p className="text-3xl font-semibold">
          {value === undefined ? <span className="text-muted-foreground text-lg">-</span> : value}
        </p>
      </CardContent>
    </Card>
  )
}
