import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import QuizClient from './QuizClient'

export const dynamic = 'force-dynamic'

export default async function QuizRoomPage({ params }: { params: { roomId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase
    .from('members')
    .select('id, full_name')
    .eq('user_id', session.user.id)
    .single()
  if (!member) redirect('/login')

  const { data: room } = await supabase
    .from('quiz_rooms')
    .select('id, template_id, event_id, status, current_question_index, join_code, created_by')
    .eq('id', params.roomId)
    .single()

  if (!room) notFound()

  const { data: template } = await supabase
    .from('quiz_templates')
    .select('id, name, description, quiz_questions(id, question_text, options, correct_option_index, points_value, time_limit_seconds, sort_order)')
    .eq('id', room.template_id)
    .single()

  const questions = (template?.quiz_questions ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  )

  const { data: participant } = await supabase
    .from('quiz_participants')
    .select('id, total_score, rank')
    .eq('room_id', params.roomId)
    .eq('member_id', member.id)
    .single()

  const { data: answers } = await supabase
    .from('quiz_answers')
    .select('question_id, selected_option_index, is_correct, points_earned')
    .eq('room_id', params.roomId)
    .eq('member_id', member.id)

  const role = room.created_by === member.id ? 'host' : 'participant'

  return (
    <QuizClient
      room={room}
      questions={questions}
      participant={participant}
      answers={answers ?? []}
      role={role}
      memberId={member.id}
      memberName={member.full_name ?? 'Player'}
      templateName={template?.name ?? 'Quiz'}
    />
  )
}
