'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

interface Props {
  subscriberCount: number
}

export default function PushAdmin({ subscriberCount }: Props) {
  const [target, setTarget] = useState<'all' | 'member'>('all')
  const [memberId, setMemberId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function send() {
    if (!title.trim() || !body.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || undefined,
          member_id: target === 'member' && memberId.trim() ? memberId.trim() : undefined,
        }),
      })
      if (res.ok) {
        setResult('Sent successfully!')
        setTitle('')
        setBody('')
        setUrl('')
        setMemberId('')
      } else {
        const d = await res.json()
        setResult(`Error: ${d.error}`)
      }
    } catch {
      setResult('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Push Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send browser push notifications to members
        </p>
      </div>

      <Card className="bg-[#13161f] border-[#252b3a] mb-6">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            Active subscribers: <span className="text-foreground font-semibold">{subscriberCount}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="bg-[#13161f] border-[#252b3a]">
        <CardHeader>
          <CardTitle className="text-base">Send Notification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-3">
            <button
              onClick={() => setTarget('all')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${target === 'all' ? 'bg-[#f0e6d3] text-black' : 'bg-[#252b3a] text-muted-foreground'}`}
            >
              All Members
            </button>
            <button
              onClick={() => setTarget('member')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${target === 'member' ? 'bg-[#f0e6d3] text-black' : 'bg-[#252b3a] text-muted-foreground'}`}
            >
              Specific Member
            </button>
          </div>

          {target === 'member' && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Member ID</Label>
              <Input
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="UUID of the member"
                className="bg-[#0d0f17] border-[#252b3a]"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              className="bg-[#0d0f17] border-[#252b3a]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Body</Label>
            <textarea
              value={body}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
              placeholder="Notification body text"
              className="bg-[#0d0f17] border border-[#252b3a] rounded-md px-3 py-2 text-sm text-foreground min-h-[80px] resize-y focus:outline-none focus:ring-1 focus:ring-[#f0e6d3]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">URL (optional)</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/events or https://..."
              className="bg-[#0d0f17] border-[#252b3a]"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={send}
              disabled={loading || !title.trim() || !body.trim()}
              className="bg-[#f0e6d3] text-black hover:bg-[#e8dcc8]"
            >
              {loading ? 'Sending...' : 'Send'}
            </Button>
            {result && (
              <span className={`text-xs ${result.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {result}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
