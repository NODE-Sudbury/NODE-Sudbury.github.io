import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('members').select('id').eq('id', session.user.id).single()
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 403 })

  const body = await request.json()
  const { session_id, snapshot_data } = body
  if (!session_id || !snapshot_data) {
    return NextResponse.json({ error: 'session_id and snapshot_data required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('whiteboard_snapshots')
    .insert({
      session_id,
      snapshot_data: { dataUrl: snapshot_data },
      saved_by: member.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
