import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/events/[slug]/async/comments/[commentId]/upvote
// Toggles an upvote on a comment. Auth required.
// Returns { upvoted: boolean, count: number }
export async function POST(
  _request: Request,
  { params }: { params: { slug: string; commentId: string } }
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', session.user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'member_not_found' }, { status: 403 })

  // Verify the comment belongs to the correct event (via slug join)
  const { data: comment } = await supabase
    .from('async_comments')
    .select('id, upvote_count, event_id, events!inner(slug)')
    .eq('id', params.commentId)
    .eq('events.slug', params.slug)
    .single()
  if (!comment) return NextResponse.json({ error: 'comment_not_found' }, { status: 404 })

  // Check for existing upvote
  const { data: existing } = await supabase
    .from('async_comment_upvotes')
    .select('comment_id')
    .eq('comment_id', params.commentId)
    .eq('member_id', member.id)
    .maybeSingle()

  if (existing) {
    // Remove upvote (toggle off)
    await supabase
      .from('async_comment_upvotes')
      .delete()
      .eq('comment_id', params.commentId)
      .eq('member_id', member.id)

    const newCount = Math.max(0, (comment.upvote_count ?? 0) - 1)
    await supabase
      .from('async_comments')
      .update({ upvote_count: newCount })
      .eq('id', params.commentId)

    return NextResponse.json({ upvoted: false, count: newCount })
  } else {
    // Add upvote
    const { error: insertErr } = await supabase
      .from('async_comment_upvotes')
      .insert({ comment_id: params.commentId, member_id: member.id })

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    const newCount = (comment.upvote_count ?? 0) + 1
    await supabase
      .from('async_comments')
      .update({ upvote_count: newCount })
      .eq('id', params.commentId)

    return NextResponse.json({ upvoted: true, count: newCount })
  }
}
