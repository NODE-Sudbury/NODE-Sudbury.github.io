export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function isBoard(supabase: ReturnType<typeof createServerClient>, userId: string): Promise<boolean> {
  const { data } = await supabase.from('members').select('role').eq('id', userId).single()
  return data?.role === 'board' || data?.role === 'admin'
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isBoard(supabase, session.user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const eventId = params.id

  // Verify event exists and is a workshop
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, type, title')
    .eq('id', eventId)
    .single()

  if (eventError || !event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.type !== 'workshop') {
    return NextResponse.json({ error: 'Certificates can only be awarded for workshop events' }, { status: 400 })
  }

  // Fetch all eligible registrations (confirmed, attended, or checked in)
  const { data: registrations, error: regError } = await supabase
    .from('registrations')
    .select('id, member_id, status')
    .eq('event_id', eventId)
    .in('status', ['confirmed', 'attended', 'checked_in'])

  if (regError) return NextResponse.json({ error: regError.message }, { status: 500 })
  if (!registrations || registrations.length === 0) {
    return NextResponse.json({ awarded: 0, skipped: 0 })
  }

  const now = new Date().toISOString()
  let awarded = 0
  let skipped = 0

  for (const reg of registrations) {
    if (!reg.member_id) { skipped++; continue }

    // Check if cert already exists for this member + event + type
    const { data: existing } = await supabase
      .from('certificates')
      .select('id')
      .eq('member_id', reg.member_id)
      .eq('event_id', eventId)
      .eq('cert_type', 'completion')
      .maybeSingle()

    if (existing) { skipped++; continue }

    const { error: insertError } = await supabase
      .from('certificates')
      .insert({
        member_id: reg.member_id,
        event_id: eventId,
        issued_at: now,
        cert_type: 'completion',
      })

    if (insertError) { skipped++; continue }
    awarded++
  }

  return NextResponse.json({ awarded, skipped })
}
