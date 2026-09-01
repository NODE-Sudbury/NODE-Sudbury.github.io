import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: { event_id: string; body: string; is_anonymous?: boolean }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  if (!body.event_id || !body.body?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('qa_questions')
    .insert({
      event_id: body.event_id,
      member_id: session.user.id,
      body: body.body.trim().slice(0, 500),
      is_anonymous: body.is_anonymous ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ question: data }, { status: 201 })
}
