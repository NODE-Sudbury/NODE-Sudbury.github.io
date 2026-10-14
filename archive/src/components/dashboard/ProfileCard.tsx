'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface Props { member: any }

function displayUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
}

export function ProfileCard({ member }: Props) {
  if (!member) return null

  const socials = [
    { label: 'LinkedIn', value: member.linkedin_url, href: member.linkedin_url },
    { label: 'GitHub', value: member.github_url, href: member.github_url },
    { label: 'Twitter / X', value: member.twitter_url, href: member.twitter_url },
    { label: 'Discord', value: member.discord_tag, href: null },
    { label: 'Website', value: member.website_url, href: member.website_url },
  ].filter((s) => s.value)

  const workInfo = member.member_type === 'professional'
    ? [member.job_title, member.company].filter(Boolean)
    : [member.program, member.school].filter(Boolean)

  const profileUrl = `/profile/${member.id}`

  return (
    <div className="space-y-4">
      {/* Public profile banner */}
      {member.is_public && (
        <Card className="border-[#f0e6d3]/20 bg-[#f0e6d3]/5">
          <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#f0e6d3]">Public profile is on</p>
              <p className="text-xs text-muted-foreground mt-0.5">Visible to other members at NODE events</p>
            </div>
            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#f0e6d3] hover:underline shrink-0 font-medium"
            >
              View profile →
            </a>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profile</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Row label="Name" value={member.full_name} />
          <Separator />
          <Row label="Email" value={member.email} />
          <Separator />
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">Type</span>
            <Badge variant="secondary" className="capitalize">{member.member_type}</Badge>
          </div>
          {workInfo.length > 0 && (
            <>
              <Separator />
              <Row
                label={member.member_type === 'professional' ? 'Role' : 'Study'}
                value={workInfo.join(' at ')}
              />
            </>
          )}
          <Separator />
          <Row
            label="Member since"
            value={new Date(member.created_at).toLocaleDateString('en-CA', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          />
          <Separator />
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">Public profile</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${member.is_public ? 'bg-[#f0e6d3]/15 text-[#f0e6d3]' : 'bg-muted text-muted-foreground'}`}>
              {member.is_public ? 'On' : 'Off'}
            </span>
          </div>
        </CardContent>
      </Card>

      {socials.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Links</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {socials.map((s, i) => (
              <div key={s.label}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between px-6 py-3 gap-4">
                  <span className="text-sm text-muted-foreground shrink-0">{s.label}</span>
                  {s.href ? (
                    <a
                      href={s.href.startsWith('http') ? s.href : `https://${s.href}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[#f0e6d3] hover:underline truncate"
                    >
                      {displayUrl(s.value)}
                    </a>
                  ) : (
                    <span className="text-sm truncate">{s.value}</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {socials.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No social links yet. Add them in Edit Profile.
        </p>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between px-6 py-3 gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right truncate">{value}</span>
    </div>
  )
}
