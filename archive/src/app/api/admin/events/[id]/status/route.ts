import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendEventCancelled, sendEventPostponed } from '@/lib/email'

export const dynamic = 'force-dynamic'

const CHAPTER_ID = '00000000-0000-0000-0000-000000000001'
const VALID_STATUSES = ['draft', 'published', 'cancelled', 'postponed', 'archived', 'unlisted', 'private']

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (member?.role !== 'board') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { status, new_date } = await request.json()
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const { data: event, error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', params.id)
    .eq('chapter_id', CHAPTER_ID)
    .select('id, title, slug, starts_at, ends_at, description, event_locations(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Dispatch Discord webhook on publish
  if (status === 'published') {
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/webhooks/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'event.published',
        payload: {
          title: event.title,
          description: 'A new event has been published!',
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/events/${event.slug}`,
        },
      }),
    })
  }

  // Notify attendees on cancel or postpone
  if (status === 'cancelled' || status === 'postponed') {
    void (async () => {
      try {
        const admin = serviceRole()
        const { data: regs } = await admin
          .from('registrations')
          .select('member_id, members(display_name)')
          .eq('event_id', params.id)
          .in('status', ['confirmed', 'pending_payment'])

        if (!regs || regs.length === 0) return

        const memberIds = regs.map(r => r.member_id)
        const emailMap: Record<string, string> = {}
        const nameMap: Record<string, string> = {}

        await Promise.all(
          memberIds.map(async (mid) => {
            const { data: auth } = await admin.auth.admin.getUserById(mid)
            if (auth?.user?.email) emailMap[mid] = auth.user.email
            const row = regs.find(r => r.member_id === mid)
            const memberData = Array.isArray(row?.members) ? row?.members[0] : row?.members as any
            nameMap[mid] = memberData?.display_name || (emailMap[mid]?.split('@')[0] ?? 'there')
          })
        )

        const locationName = (event.event_locations as any)?.name ?? null
        const eventInfo = { ...event, location: locationName }

        await Promise.allSettled(
          Object.entries(emailMap).map(([mid, email]) => {
            if (status === 'cancelled') {
              return sendEventCancelled(email, nameMap[mid], eventInfo)
            } else {
              const newDate = new_date || 'TBD - check the event page for updates'
              return sendEventPostponed(email, nameMap[mid], eventInfo, newDate)
            }
          })
        )

        // Log emails
        const logs = Object.entries(emailMap).map(([mid, email]) => ({
          member_id: mid,
          email,
          email_type: status === 'cancelled' ? 'cancelled' : 'postponed',
          event_id: params.id,
        }))
        await admin.from('email_logs').insert(logs)
      } catch (err) {
        console.error('[Email] Status notification failed:', err)
      }
    })()
  }

  return NextResponse.json({ event })
}
