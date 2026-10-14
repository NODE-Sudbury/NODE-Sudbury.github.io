import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: member } = await supabase
    .from('members').select('role').eq('user_id', session.user.id).single()
  if (!member || member.role !== 'board') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(_req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('async_submissions')
    .select('*, members(display_name, avatar_url), async_challenges(title, submission_type)')
    .eq('event_id', params.eventId)
    .order('submitted_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
