import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/events/[slug]/async/comments?window_id=X
// Returns comments for a given async_event_window, ordered by upvotes DESC then created_at ASC
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { searchParams } = new URL(request.url)
  const windowId = searchParams.get('window_id')
  if (!windowId) return NextResponse.json({ error: 'window_id required' }, { status: 400 })

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Fetch the current user session to know if they have upvoted each comment
  const { data: { session } } = await supabase.auth.getSession()
  let memberId: string | null = null
  if (session) {
    const { data: m } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', session.user.id)
      .single()
    memberId = m?.id ?? null
  }

  const { data: comments, error } = await supabase
    .from('async_comments')
    .select('id, content, upvote_count, created_at, members(id, display_name, avatar_url)')
    .eq('event_id', event.id)
    .eq('window_id', windowId)
    .order('upvote_count', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach whether the current member has upvoted each comment
  let myUpvotes: Set<string> = new Set()
  if (memberId && comments && comments.length > 0) {
    const commentIds = comments.map((c: { id: string }) => c.id)
    const { data: upvoteRows } = await supabase
      .from('async_comment_upvotes')
      .select('comment_id')
      .eq('member_id', memberId)
      .in('comment_id', commentIds)
    if (upvoteRows) {
      myUpvotes = new Set(upvoteRows.map((r: { comment_id: string }) => r.comment_id))
    }
  }

  const result = (comments ?? []).map((c: any) => ({
    ...c,
    my_upvote: myUpvotes.has(c.id),
  }))

  return NextResponse.json({ comments: result })
}

// POST /api/events/[slug]/async/comments
// Body: { window_id, content }
// Auth required; member must be registered for the event
export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', session.user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'member_not_found' }, { status: 403 })

  // Verify the member is registered for this event
  const { data: registration } = await supabase
    .from('registrations')
    .select('id')
    .eq('event_id', event.id)
    .eq('member_id', member.id)
    .eq('status', 'confirmed')
    .maybeSingle()
  if (!registration) return NextResponse.json({ error: 'not_registered' }, { status: 403 })

  const body = await request.json()
  const { window_id, content } = body ?? {}

  if (!window_id) return NextResponse.json({ error: 'window_id required' }, { status: 400 })
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'content required' }, { status: 400 })
  }
  if (content.trim().length > 2000) {
    return NextResponse.json({ error: 'content too long (max 2000 chars)' }, { status: 400 })
  }

  const { data: comment, error } = await supabase
    .from('async_comments')
    .insert({
      event_id: event.id,
      window_id,
      member_id: member.id,
      content: content.trim(),
    })
    .select('id, content, upvote_count, created_at, members(id, display_name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ comment: { ...comment, my_upvote: false } }, { status: 201 })
}
