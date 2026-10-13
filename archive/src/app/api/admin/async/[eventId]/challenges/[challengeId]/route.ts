import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getBoardSupabase() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: member } = await supabase
    .from('members').select('role').eq('user_id', session.user.id).single()
  if (!member || member.role !== 'board') return null
  return supabase
}

export async function PATCH(request: Request, { params }: { params: { eventId: string; challengeId: string } }) {
  const supabase = await getBoardSupabase()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const { data, error } = await supabase
    .from('async_challenges').update(body).eq('id', params.challengeId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { eventId: string; challengeId: string } }) {
  const supabase = await getBoardSupabase()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { error } = await supabase.from('async_challenges').delete().eq('id', params.challengeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
