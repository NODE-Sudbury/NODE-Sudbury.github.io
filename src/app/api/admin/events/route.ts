import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CHAPTER_ID = '00000000-0000-0000-0000-000000000001'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (member?.role !== 'board') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await request.json()
  const { title, type, starts_at, ends_at } = body

  if (!title || !type || !starts_at || !ends_at) {
    return NextResponse.json({ error: 'title, type, starts_at, ends_at are required' }, { status: 400 })
  }

  if (new Date(ends_at) <= new Date(starts_at)) {
    return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 })
  }

  const year = new Date(starts_at).getFullYear()
  let baseSlug = body.slug?.trim() ? body.slug.trim() : `${slugify(title)}-${year}`
  let slug = baseSlug
  let suffix = 2

  while (true) {
    const { data: existing } = await supabase.from('events').select('id').eq('slug', slug).maybeSingle()
    if (!existing) break
    slug = `${baseSlug}-${suffix++}`
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title,
      slug,
      type,
      status: body.status ?? 'draft',
      short_description: body.short_description ?? null,
      description: body.description ?? null,
      starts_at,
      ends_at,
      max_capacity: body.max_capacity ?? null,
      location_id: body.location_id ?? null,
      chapter_id: CHAPTER_ID,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ event }, { status: 201 })
}
