import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(_request: Request, { params }: { params: { token: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: consent } = await supabase
    .from('minor_consent_records')
    .select('id, registration_id')
    .eq('consent_token', params.token)
    .single()

  if (!consent) return NextResponse.json({ error: 'invalid_token' }, { status: 404 })

  if (consent.registration_id) {
    await supabase
      .from('registrations')
      .update({ status: 'cancelled' })
      .eq('id', consent.registration_id)
  }

  return NextResponse.json({ success: true })
}
