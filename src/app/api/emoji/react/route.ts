import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ALLOWED_EMOJI = ['👏', '🔥', '❤️', '🚀', '💡', '😂', '👍', '🎉']

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: { event_id: string; emoji: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  if (!body.event_id || !ALLOWED_EMOJI.includes(body.emoji)) {
    return NextResponse.json({ error: 'invalid_emoji' }, { status: 400 })
  }

  // Broadcast via Realtime - use service role client to broadcast server-side
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await adminClient
    .channel(`emoji:${body.event_id}`)
    .send({
      type: 'broadcast',
      event: 'emoji',
      payload: { emoji: body.emoji, member_id: session.user.id, ts: Date.now() },
    })

  await supabase.from('emoji_reactions').insert({
    event_id: body.event_id,
    member_id: session.user.id,
    emoji: body.emoji,
  })

  return NextResponse.json({ ok: true })
}
