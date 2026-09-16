import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface Member {
  id: string
  full_name: string
  avatar_url: string | null
  member_type: string
  job_title: string | null
  company: string | null
  school: string | null
  program: string | null
  linkedin_url: string | null
  github_url: string | null
  twitter_url: string | null
  website_url: string | null
  created_at: string
  is_public: boolean
}

interface Props { member: Member | null }

function displayUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
}

export default function PublicProfile({ member }: Props) {
  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-3">
        <p className="text-lg font-semibold">Profile not found</p>
        <p className="text-sm text-muted-foreground">This profile is private or doesn't exist.</p>
        <a href="/" className="text-sm text-[#f0e6d3] hover:underline mt-2">Back to NODE</a>
      </div>
    )
  }

  const initials = member.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() ?? '?'

  const socials = [
    { label: 'LinkedIn', key: 'linkedin_url', value: member.linkedin_url },
    { label: 'GitHub', key: 'github_url', value: member.github_url },
    { label: 'Twitter / X', key: 'twitter_url', value: member.twitter_url },
    { label: 'Website', key: 'website_url', value: member.website_url },
  ].filter((s) => s.value) as { label: string; key: string; value: string }[]

  const workLine = member.member_type === 'professional'
    ? [member.job_title, member.company].filter(Boolean).join(' at ')
    : [member.program, member.school].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto px-4 py-12">

        {/* NODE header */}
        <div className="text-center mb-10">
          <a href="/" className="inline-block">
            <span className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</span>
            <span className="text-sm font-light tracking-wider text-muted-foreground"> Sudbury</span>
          </a>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <Avatar className="h-20 w-20">
            <AvatarImage src={member.avatar_url ?? undefined} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h1 className="text-xl font-semibold">{member.full_name}</h1>
            {workLine && <p className="text-sm text-muted-foreground mt-1">{workLine}</p>}
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline" className="capitalize text-xs">{member.member_type}</Badge>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                Member since {new Date(member.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        </div>

        {/* Social links */}
        {socials.length > 0 && (
          <Card>
            <CardContent className="p-0">
              {socials.map((s, i) => (
                <div key={s.key}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between px-6 py-3 gap-4">
                    <span className="text-sm text-muted-foreground shrink-0">{s.label}</span>
                    <a
                      href={s.value.startsWith('http') ? s.value : `https://${s.value}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[#f0e6d3] hover:underline truncate"
                    >
                      {displayUrl(s.value)}
                    </a>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-10">
          This is a NODE member profile shared for event networking.{' '}
          <a href="/" className="text-[#f0e6d3] hover:underline">Learn about NODE</a>
        </p>
      </div>
    </div>
  )
}
