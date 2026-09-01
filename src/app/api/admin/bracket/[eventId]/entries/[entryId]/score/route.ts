import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: { eventId: string; entryId: string } }) {
  const cookieStore = cookies()
    const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: m } = await supabase.from('members').select('is_board').eq('user_id', user.id).single()
  if (!m?.is_board) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { score } = await req.json()
  // entryId here is team_id:round_id composite - we pass round_id+team_id as "roundId-teamId"
  const [roundId, teamId] = params.entryId.split('--')
  const { error } = await supabase
    .from('hackathon_round_teams')
    .update({ score })
    .eq('round_id', roundId)
    .eq('team_id', teamId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
