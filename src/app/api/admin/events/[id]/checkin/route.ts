import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!member || !['board', 'admin'].includes(member.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { registration_id, checked_in } = body as { registration_id: string; checked_in: boolean }

  if (!registration_id) {
    return NextResponse.json({ error: 'registration_id required' }, { status: 400 })
  }

  const now = new Date().toISOString()

  // Update registration status
  const { data: updatedReg, error: updateError } = await supabase
    .from('registrations')
    .update({
      checked_in_at: checked_in ? now : null,
      status: checked_in ? 'checked_in' : 'confirmed',
    })
    .eq('id', registration_id)
    .eq('event_id', params.id)
    .select('member_id')
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // If checking in, auto-award completion certificate for workshop events
  let certificate_awarded = false
  if (checked_in && updatedReg?.member_id) {
    const { data: event } = await supabase
      .from('events')
      .select('type')
      .eq('id', params.id)
      .single()

    if (event?.type === 'workshop') {
      // Only insert if cert doesn't already exist
      const { data: existing } = await supabase
        .from('certificates')
        .select('id')
        .eq('member_id', updatedReg.member_id)
        .eq('event_id', params.id)
        .eq('cert_type', 'completion')
        .maybeSingle()

      if (!existing) {
        const { error: certError } = await supabase
          .from('certificates')
          .insert({
            member_id: updatedReg.member_id,
            event_id: params.id,
            issued_at: now,
            cert_type: 'completion',
          })
        if (!certError) certificate_awarded = true
      }
    }
  }

  return NextResponse.json({ success: true, certificate_awarded })
}
