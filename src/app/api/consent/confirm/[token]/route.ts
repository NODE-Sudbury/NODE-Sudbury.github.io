import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(_request: Request, { params }: { params: { token: string } }) {
  // Public endpoint - uses service role to bypass RLS for guardian link
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: consent } = await supabase
    .from('minor_consent_records')
    .select('id, registration_id, consent_given')
    .eq('consent_token', params.token)
    .single()

  if (!consent) return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
  if (consent.consent_given) return NextResponse.json({ message: 'already_consented' })

  await supabase
    .from('minor_consent_records')
    .update({ consent_given: true, consented_at: new Date().toISOString() })
    .eq('id', consent.id)

  if (consent.registration_id) {
    await supabase
      .from('registrations')
      .update({ status: 'confirmed' })
      .eq('id', consent.registration_id)
      .eq('status', 'pending_consent')
  }

  return NextResponse.json({ success: true })
}
