import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function makeClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
}

async function requireBoard(supabase: ReturnType<typeof makeClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const { data } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  return data && ['board', 'admin', 'super_admin'].includes(data.role)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; mentorId: string } }) {
  const supabase = makeClient()
  if (!await requireBoard(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.title !== undefined) updates.title = body.title
  if (body.company !== undefined) updates.company = body.company
  if (body.bio !== undefined) updates.bio = body.bio
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order
  if (body.expertise_tags !== undefined) {
    updates.expertise_tags = typeof body.expertise_tags === 'string'
      ? body.expertise_tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : body.expertise_tags
  }

  const { data, error } = await supabase
    .from('event_mentors')
    .update(updates)
    .eq('id', params.mentorId)
    .eq('event_id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; mentorId: string } }) {
  const supabase = makeClient()
  if (!await requireBoard(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('event_mentors')
    .delete()
    .eq('id', params.mentorId)
    .eq('event_id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
