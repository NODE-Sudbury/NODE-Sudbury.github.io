import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendPostEventEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
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

  const { survey_url, recording_url } = await request.json()

  const admin = serviceRole()

  const { data: ev } = await admin
    .from('events')
    .select('id, title, slug, starts_at, ends_at, description, event_locations(name)')
    .eq('id', params.id)
    .single()
  if (!ev) return NextResponse.json({ error: 'event not found' }, { status: 404 })

  // Include confirmed + checked-in registrations
  const { data: regs } = await admin
    .from('registrations')
    .select('member_id')
    .eq('event_id', params.id)
    .in('status', ['confirmed', 'checked_in'])

  if (!regs || regs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const locationName = (ev.event_locations as any)?.name ?? null
  const eventInfo = { ...ev, location: locationName }
  let sent = 0

  await Promise.allSettled(
    regs.map(async (reg) => {
      const { data: auth } = await admin.auth.admin.getUserById(reg.member_id)
      const email = auth?.user?.email
      if (!email) return

      const { data: memberRow } = await admin.from('members').select('display_name').eq('id', reg.member_id).single()
      const name = memberRow?.display_name || email.split('@')[0]

      await sendPostEventEmail(email, name, eventInfo, survey_url ?? undefined, recording_url ?? undefined)
      await admin.from('email_logs').insert({
        member_id: reg.member_id,
        email,
        email_type: 'post_event',
        event_id: params.id,
      })
      sent++
    })
  )

  return NextResponse.json({ ok: true, sent })
}
