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

  if (body.all) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('member_id', member.id)
      .eq('is_read', false)
    return NextResponse.json({ ok: true })
  }

  if (body.id) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', body.id)
      .eq('member_id', member.id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Provide id or all:true' }, { status: 400 })
}
