import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { eventId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (member?.role !== 'board') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { judge_email, submission_id } = body
  if (!judge_email?.trim()) return NextResponse.json({ error: 'judge_email required' }, { status: 400 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: judgeMember } = await db.from('members').select('id, full_name, email').eq('email', judge_email.trim()).single()
  if (!judgeMember) return NextResponse.json({ error: 'Member not found with that email' }, { status: 404 })

  const { data: existingJudge } = await db.from('judges').select('id').eq('event_id', params.eventId).eq('member_id', judgeMember.id).maybeSingle()

  let judge = existingJudge
  if (!judge) {
    const { data, error } = await db.from('judges').insert({ event_id: params.eventId, member_id: judgeMember.id }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    judge = data
  }

  let assignment = null
  if (submission_id && judge) {
    const { data, error } = await db.from('judging_assignments').insert({ judge_id: judge.id, submission_id, event_id: params.eventId }).select().single()
    if (error && !error.message.includes('duplicate')) return NextResponse.json({ error: error.message }, { status: 500 })
    assignment = data
  }

  return NextResponse.json({ judge: { ...judge, members: { full_name: judgeMember.full_name, email: judgeMember.email } }, assignment }, { status: 201 })
}
