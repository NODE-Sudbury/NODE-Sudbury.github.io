import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(request: Request, { params }: { params: { token: string } }) {
  const { token } = params

  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
  }

  const supabase = serviceRole()

  const { data: sponsor } = await supabase
    .from('event_sponsors')
    .select('id, portal_access_token, portal_token_expires_at')
    .eq('portal_access_token', token)
    .gt('portal_token_expires_at', new Date().toISOString())
    .maybeSingle()

  if (!sponsor) {
    return NextResponse.json({ error: 'token_invalid_or_expired' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const allowed = ['description', 'website_url', 'booth_description', 'contact_name', 'contact_email', 'logo_url']
  const updates: Record<string, string | null> = {}
  for (const key of allowed) {
    if (key in body && typeof body[key] === 'string') {
      updates[key] = (body[key] as string).trim() || null
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_valid_fields' }, { status: 400 })
  }

  const { data: updated, error } = await supabase
    .from('event_sponsors')
    .update(updates)
    .eq('id', sponsor.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sponsor: updated })
}
