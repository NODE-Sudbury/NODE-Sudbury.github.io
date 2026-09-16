import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import MentorshipClient from './MentorshipClient'

export const dynamic = 'force-dynamic'

export default async function MentorshipPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase
    .from('members')
    .select('id, full_name')
    .eq('user_id', session.user.id)
    .single()

  if (!member) redirect('/login')

  const [{ data: myProfile }, { data: mentors }, { data: myRequests }] = await Promise.all([
    supabase
      .from('mentorship_profiles')
      .select('is_mentor, skills, capacity, bio')
      .eq('member_id', member.id)
      .maybeSingle(),
    supabase
      .from('mentorship_profiles')
      .select('member_id, bio, skills, capacity, member:members(id, full_name, avatar_url, job_title, company)')
      .eq('is_mentor', true)
      .neq('member_id', member.id),
    supabase
      .from('mentorship_requests')
      .select('id, mentor_id, mentee_id, status, message, created_at')
      .or(`mentor_id.eq.${member.id},mentee_id.eq.${member.id}`),
  ])

  type MentorProfile = {
    member_id: string
    bio: string | null
    skills: string[] | null
    capacity: number
    member: {
      id: string
      full_name: string | null
      avatar_url: string | null
      job_title: string | null
      company: string | null
    } | null
  }

  return (
    <MentorshipClient
      myMemberId={member.id}
      myProfile={myProfile}
      mentors={(mentors ?? []) as unknown as MentorProfile[]}
      myRequests={myRequests ?? []}
    />
  )
}
