'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AvatarCrop } from './AvatarCrop'

interface Props {
  supabase: any
  member: any
  onSave: (updated: any) => void
}

export function EditProfile({ supabase, member, onSave }: Props) {
  const [form, setForm] = useState({
    job_title: member?.job_title ?? '',
    company: member?.company ?? '',
    school: member?.school ?? '',
    program: member?.program ?? '',
    linkedin_url: member?.linkedin_url ?? '',
    github_url: member?.github_url ?? '',
    twitter_url: member?.twitter_url ?? '',
    discord_tag: member?.discord_tag ?? '',
    website_url: member?.website_url ?? '',
    member_type: member?.member_type ?? 'professional',
    is_public: member?.is_public ?? true,
  })
  const [avatarUrl, setAvatarUrl] = useState<string>(member?.avatar_url ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const initials = member?.full_name
    ?.split(' ').map((n: string) => n[0]).join('').toUpperCase() ?? '?'

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { is_public, ...coreFields } = form

    const { data, error: err } = await supabase
      .from('members').update(coreFields).eq('id', member.id).select().single()

    if (err) { setSaving(false); setError(err.message); return }

    // Save is_public separately - silently skip if column not yet migrated
    await supabase.from('members').update({ is_public }).eq('id', member.id).select().maybeSingle()

    setSaving(false)
    setSaved(true)
    onSave({ ...data, is_public })
  }

  const isProfessional = form.member_type === 'professional'

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Avatar */}
      <AvatarCrop
        supabase={supabase}
        memberId={member?.id}
        currentAvatarUrl={avatarUrl}
        initials={initials}
        onSaved={(url) => {
          setAvatarUrl(url)
          onSave({ ...member, avatar_url: url })
        }}
      />

      {/* Member type toggle */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account type</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {(['professional', 'student'] as const).map((t) => (
            <Button
              key={t} type="button" size="sm"
              variant={form.member_type === t ? 'secondary' : 'outline'}
              onClick={() => set('member_type', t)}
              className="capitalize"
            >
              {t}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Public profile */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Public profile</CardTitle>
            <button
              type="button"
              role="switch"
              aria-checked={form.is_public}
              onClick={() => { setForm((p) => ({ ...p, is_public: !p.is_public })); setSaved(false) }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${form.is_public ? 'bg-[#f0e6d3]' : 'bg-muted'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${form.is_public ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            When enabled, your name, role, and social links are visible to other NODE members at events - great for networking. Your email is never shown publicly.
          </p>
          {form.is_public && member?.id && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Your profile URL:</span>
              <a
                href={`/profile/${member.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#f0e6d3] hover:underline font-mono"
              >
                /profile/{member.id.slice(0, 8)}…
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work / Education */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isProfessional ? 'Work' : 'Education'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isProfessional ? (
            <>
              <Field label="Job title" value={form.job_title} onChange={(v) => set('job_title', v)} placeholder="Software Engineer" />
              <Separator />
              <Field label="Company" value={form.company} onChange={(v) => set('company', v)} placeholder="Acme Corp" />
            </>
          ) : (
            <>
              <Field label="School" value={form.school} onChange={(v) => set('school', v)} placeholder="Laurentian University" />
              <Separator />
              <Field label="Program" value={form.program} onChange={(v) => set('program', v)} placeholder="Computer Science" />
            </>
          )}
        </CardContent>
      </Card>

      {/* Social links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Social links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="LinkedIn" value={form.linkedin_url} onChange={(v) => set('linkedin_url', v)} placeholder="linkedin.com/in/yourname" />
          <Separator />
          <Field label="GitHub" value={form.github_url} onChange={(v) => set('github_url', v)} placeholder="github.com/yourname" />
          <Separator />
          <Field label="Twitter / X" value={form.twitter_url} onChange={(v) => set('twitter_url', v)} placeholder="x.com/yourname" />
          <Separator />
          <Field label="Discord" value={form.discord_tag} onChange={(v) => set('discord_tag', v)} placeholder="yourname#0000" />
          <Separator />
          <Field label="Website" value={form.website_url} onChange={(v) => set('website_url', v)} placeholder="yoursite.com" />
        </CardContent>
      </Card>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={saving}
        className="bg-[#f0e6d3] text-[#0a0a0a] hover:bg-[#e8d9c0] font-semibold"
      >
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
      </Button>
    </form>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex items-center gap-4">
      <Label htmlFor={id} className="w-28 shrink-0 text-muted-foreground text-sm">{label}</Label>
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-sm"
      />
    </div>
  )
}
