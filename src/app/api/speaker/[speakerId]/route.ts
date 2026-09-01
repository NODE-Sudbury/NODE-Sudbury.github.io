import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function makeClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
}

export async function PATCH(req: NextRequest, { params }: { params: { speakerId: string } }) {
  const supabase = makeClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch the speaker record to verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('event_speakers')
    .select('id, member_id')
    .eq('id', params.speakerId)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Speaker record not found' }, { status: 404 })
  }

  if (existing.member_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  const updates: Record<string, string | null> = {}
  if (body.bio !== undefined) updates.bio = body.bio || null
  if (body.headshot_url !== undefined) updates.photo_url = body.headshot_url || null
  if (body.website_url !== undefined) updates.website_url = body.website_url || null
  if (body.talk_title !== undefined) updates.talk_title = body.talk_title || null
  if (body.talk_abstract !== undefined) updates.talk_description = body.talk_abstract || null
  if (body.slide_deck_url !== undefined) updates.slide_deck_url = body.slide_deck_url || null
  if (body.logistics_notes !== undefined) updates.logistics_notes = body.logistics_notes || null

  const { data, error } = await supabase
    .from('event_speakers')
    .update(updates)
    .eq('id', params.speakerId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
