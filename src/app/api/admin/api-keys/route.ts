import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

async function getAuthedUser(supabase: ReturnType<typeof createServerClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { session: null, allowed: false }
  const { data } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  const allowed = !!data && ['board', 'admin', 'super_admin'].includes(data.role)
  return { session, allowed }
}

function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
}

export async function GET() {
  const supabase = makeSupabase()
  const { session, allowed } = await getAuthedUser(supabase)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, label, prefix, created_at, last_used_at')
    .eq('created_by', session.user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const keys = (data ?? []).map((row) => ({
    id: row.id,
    name: row.label,
    prefix: row.prefix,
    created_at: row.created_at,
    last_used_at: row.last_used_at,
  }))

  return NextResponse.json({ keys })
}

export async function POST(req: Request) {
  const supabase = makeSupabase()
  const { session, allowed } = await getAuthedUser(supabase)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const name: string = body.name ?? ''
  if (!name.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const rawKey = randomBytes(32).toString('hex')
  const prefix = rawKey.slice(0, 8)
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const { data, error } = await supabase
    .from('api_keys')
    .insert({ label: name, prefix, key_hash: keyHash, created_by: session.user.id })
    .select('id, label, prefix, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    rawKey,
    key: {
      id: data.id,
      label: data.label,
      prefix: data.prefix,
      created_at: data.created_at,
      last_used_at: null,
      revoked_at: null,
    },
  })
}

export async function DELETE(req: Request) {
  const supabase = makeSupabase()
  const { session, allowed } = await getAuthedUser(supabase)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('created_by', session.user.id)
    .is('revoked_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
