import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (!member || !['board', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [eventsStatusRes, allRegsRes, membersRes, eventsTableRes] = await Promise.all([
    supabase.from('events').select('status'),
    supabase.from('registrations').select('status'),
    supabase.from('members').select('id', { count: 'exact', head: true }),
    supabase.from('events').select(`
      id, title, slug, type, status, starts_at, max_capacity,
      registrations(id, status, checked_in_at, ticket_type_id,
        ticket_types(price_cents))
    `).order('starts_at', { ascending: false }),
  ])

  const eventStatuses = eventsStatusRes.data ?? []
  const allRegs = allRegsRes.data ?? []
  const memberCount = membersRes.count ?? 0

  // Aggregate per-event stats
  const eventStats = (eventsTableRes.data ?? []).map((e: any) => {
    const regs: any[] = e.registrations ?? []
    const confirmed = regs.filter((r) => r.status === 'confirmed')
    const waitlisted = regs.filter((r) => r.status === 'waitlisted')
    const checkedIn = confirmed.filter((r) => r.checked_in_at)
    const revenue = confirmed.reduce((sum: number, r: any) => {
      const ticket = Array.isArray(r.ticket_types) ? r.ticket_types[0] : r.ticket_types
      return sum + (ticket?.price_cents ?? 0)
    }, 0)
    return {
      id: e.id,
      title: e.title,
      slug: e.slug,
      type: e.type,
      status: e.status,
      starts_at: e.starts_at,
      max_capacity: e.max_capacity,
      confirmed_count: confirmed.length,
      waitlist_count: waitlisted.length,
      checkin_count: checkedIn.length,
      revenue_cents: revenue,
    }
  })

  const totalRevenue = eventStats.reduce((s: number, e: any) => s + e.revenue_cents, 0)
  const publishedEvents = eventStatuses.filter((e: any) => e.status === 'published').length
  const confirmedRegs = allRegs.filter((r: any) => r.status === 'confirmed').length

  return NextResponse.json({
    summary: {
      published_events: publishedEvents,
      total_events: eventStatuses.length,
      confirmed_registrations: confirmedRegs,
      total_registrations: allRegs.length,
      member_count: memberCount,
      total_revenue_cents: totalRevenue,
    },
    events: eventStats,
  })
}
