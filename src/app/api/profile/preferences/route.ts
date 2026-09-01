import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: { dietary_restrictions?: string[]; tshirt_size?: string; date_of_birth?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (body.dietary_restrictions !== undefined) update.dietary_restrictions = body.dietary_restrictions
  if (body.tshirt_size !== undefined) update.tshirt_size = body.tshirt_size
  if (body.date_of_birth !== undefined) update.date_of_birth = body.date_of_birth || null

  const { error } = await supabase
    .from('members')
    .update(update)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: member } = await supabase
    .from('members')
    .select('dietary_restrictions, tshirt_size')
    .eq('user_id', session.user.id)
    .single()

  return NextResponse.json(member ?? {})
}
