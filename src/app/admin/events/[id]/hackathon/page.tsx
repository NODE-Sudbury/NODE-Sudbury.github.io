import { redirect } from 'next/navigation'

export default function HackathonRedirect({ params }: { params: { id: string } }) {
  redirect(`/admin/hackathon/${params.id}`)
}
