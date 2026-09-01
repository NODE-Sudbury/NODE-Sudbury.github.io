import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getBoard(supabase: ReturnType<typeof createServerClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: member } = await supabase
    .from('members')
    .select('id, role')
    .eq('user_id', session.user.id)
    .single()
  if (!member || member.role !== 'board') return null
  return member
}

export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const board = await getBoard(supabase)
  if (!board) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('quiz_templates')
    .select('id, name, description, created_at, quiz_questions(id)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const board = await getBoard(supabase)
  if (!board) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: { name?: string; description?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { name, description } = body
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  const { data, error } = await supabase
    .from('quiz_templates')
    .insert({ name, description: description ?? null, created_by: board.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
