import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { eventId: string } }
) {
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

  const { eventId } = params

  const [eventRes, registrationsRes, ticketTypesRes] = await Promise.all([
    supabase.from('events').select('id, title, starts_at, ends_at, max_capacity, status').eq('id', eventId).single(),
    supabase.from('registrations').select('id, status, checked_in_at, created_at, ticket_type_id, ticket_types(name, price_cents)').eq('event_id', eventId),
    supabase.from('ticket_types').select('id, name, price_cents').eq('event_id', eventId),
  ])

  if (!eventRes.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const regs = registrationsRes.data ?? []
  const confirmed = regs.filter(r => r.status === 'confirmed')
  const waitlisted = regs.filter(r => r.status === 'waitlisted')
  const cancelled = regs.filter(r => r.status === 'cancelled')
  const checkedIn = confirmed.filter(r => r.checked_in_at)
  const noShow = confirmed.filter(r =>
    !r.checked_in_at && eventRes.data!.ends_at && new Date(eventRes.data!.ends_at) < new Date()
  )

  // Revenue
  const revenue = confirmed.reduce((sum, r) => {
    const ticket = r.ticket_types as any
    return sum + (ticket?.price_cents ?? 0)
  }, 0)

  // Registrations per day
  const dayMap: Record<string, number> = {}
  for (const r of regs) {
    const day = r.created_at.slice(0, 10)
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  const registrationsByDay = Object.entries(dayMap)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day))

  // Ticket type breakdown
  const ticketBreakdown = (ticketTypesRes.data ?? []).map(tt => {
    const count = confirmed.filter(r => r.ticket_type_id === tt.id).length
    return { name: tt.name, price_cents: tt.price_cents, count }
  })

  // Status breakdown
  const statusBreakdown = [
    { status: 'confirmed', count: confirmed.length },
    { status: 'waitlisted', count: waitlisted.length },
    { status: 'cancelled', count: cancelled.length },
  ]

  return NextResponse.json({
    event: eventRes.data,
    stats: {
      confirmed_count: confirmed.length,
      waitlist_count: waitlisted.length,
      cancelled_count: cancelled.length,
      checkin_count: checkedIn.length,
      no_show_count: noShow.length,
      revenue_cents: revenue,
      checkin_rate: confirmed.length > 0
        ? Math.round((checkedIn.length / confirmed.length) * 100)
        : 0,
    },
    registrations_by_day: registrationsByDay,
    ticket_breakdown: ticketBreakdown,
    status_breakdown: statusBreakdown,
  })
}
