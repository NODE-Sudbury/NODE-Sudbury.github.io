import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

  const body = await request.json()
  const update: Record<string, string | null> = {}
  if ('recording_url' in body) update.recording_url = body.recording_url || null
  if ('photos_url' in body) update.photos_url = body.photos_url || null
  if ('recap_url' in body) update.recap_url = body.recap_url || null

  const { error } = await supabase.from('events').update(update).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
