import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

async function getBoard(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const { data } = await supabase.from('members').select('role').eq('id', userId).single()
  return data?.role === 'board' || data?.role === 'admin'
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await makeSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!await getBoard(supabase, session.user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (typeof body.description === 'string') updates.description = body.description.trim() || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('event_series')
    .update(updates)
    .eq('id', params.id)
    .select('id, name, slug, is_active, description')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ series: data })
}
