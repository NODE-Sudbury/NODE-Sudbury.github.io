'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function AdminSettings() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [form, setForm] = useState({
    org_name: '', tagline: '', description: '',
    website_url: '', email: '',
    linkedin_url: '', twitter_url: '', instagram_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 1).single()
      .then(({ data }) => { if (data) setForm({ ...form, ...data }) })
  }, [])

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('settings').update({ ...form, updated_at: new Date().toISOString() }).eq('id', 1)
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true)
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Organisation info shown on public pages.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name" value={form.org_name} onChange={(v) => set('org_name', v)} placeholder="NODE Sudbury" />
          <Separator />
          <Field label="Tagline" value={form.tagline} onChange={(v) => set('tagline', v)} placeholder="Northern Ontario Dev Exchange" />
          <Separator />
          <Field label="Description" value={form.description} onChange={(v) => set('description', v)} placeholder="Short bio shown on the public site" />
          <Separator />
          <Field label="Website" value={form.website_url} onChange={(v) => set('website_url', v)} placeholder="nodesudbury.com" />
          <Separator />
          <Field label="Contact email" value={form.email} onChange={(v) => set('email', v)} placeholder="hello@nodesudbury.com" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Social links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="LinkedIn" value={form.linkedin_url} onChange={(v) => set('linkedin_url', v)} placeholder="linkedin.com/company/node-sudbury" />
          <Separator />
          <Field label="Twitter / X" value={form.twitter_url} onChange={(v) => set('twitter_url', v)} placeholder="x.com/nodesudbury" />
          <Separator />
          <Field label="Instagram" value={form.instagram_url} onChange={(v) => set('instagram_url', v)} placeholder="instagram.com/nodesudbury" />
        </CardContent>
      </Card>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="submit" disabled={saving} className="bg-[#f0e6d3] text-[#0a0a0a] hover:bg-[#e8d9c0] font-semibold">
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save settings'}
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
      <Input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-sm" />
    </div>
  )
}
