import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { mentor_id, message } = body

  if (!mentor_id) return NextResponse.json({ error: 'mentor_id required' }, { status: 400 })
  if (mentor_id === member.id) return NextResponse.json({ error: 'Cannot request yourself' }, { status: 400 })

  const { data: existing } = await supabase
    .from('mentorship_requests')
    .select('id, status')
    .eq('mentee_id', member.id)
    .eq('mentor_id', mentor_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Request already exists', status: existing.status }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('mentorship_requests')
    .insert({
      mentee_id: member.id,
      mentor_id,
      status: 'pending',
      message: message ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id })
}
