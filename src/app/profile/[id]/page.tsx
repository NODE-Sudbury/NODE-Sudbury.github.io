export const dynamic = 'force-dynamic'
import PublicProfile from './PublicProfile'

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  return <PublicProfile id={params.id} />
}
