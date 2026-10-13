'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-yellow-400', submitted: 'text-blue-400', final: 'text-green-400',
}

interface Props {
  event: { id: string; title: string; hackathon_finals_event_id?: string | null; submissions_open?: boolean | null }
  submissions: any[]
  judges: any[]
  assignments: any[]
  rubric: any[]
  kickoffEvent?: { id: string; title: string; starts_at: string } | null
  finalsEvent?: { id: string; title: string; starts_at: string } | null
}

export default function JudgingAdmin({ event, submissions: initSubs, judges: initJudges, assignments: initAssigns, rubric: initRubric, kickoffEvent, finalsEvent }: Props) {
  const [tab, setTab] = useState<'submissions' | 'judges' | 'rubric'>('submissions')
  const [judges, setJudges] = useState(initJudges)
  const [assignments, setAssignments] = useState(initAssigns)
  const [rubric, setRubric] = useState(initRubric)
  const [submissions] = useState(initSubs)

  const [submissionsOpen, setSubmissionsOpen] = useState<boolean>(event.submissions_open ?? true)
  const [togglingSubmissions, setTogglingSubmissions] = useState(false)

  const [judgeEmail, setJudgeEmail] = useState('')
  const [judgeSubmissionId, setJudgeSubmissionId] = useState('')
  const [selectedJudgeId, setSelectedJudgeId] = useState('')
  const [rubricName, setRubricName] = useState('')
  const [rubricDesc, setRubricDesc] = useState('')
  const [rubricMax, setRubricMax] = useState('10')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function toggleSubmissions() {
    setTogglingSubmissions(true)
    setMsg(null)
    const next = !submissionsOpen
    const res = await fetch(`/api/admin/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissions_open: next }),
    })
    if (res.ok) {
      setSubmissionsOpen(next)
      setMsg(next ? 'Submissions are now open.' : 'Submissions are now closed.')
    } else {
      const data = await res.json()
      setMsg(data.error ?? 'Failed to update submissions status.')
    }
    setTogglingSubmissions(false)
  }

  async function addJudge() {
    if (!judgeEmail.trim()) return
    setSaving(true); setMsg(null)
    const res = await fetch(`/api/admin/hackathon/${event.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ judge_email: judgeEmail.trim(), submission_id: judgeSubmissionId || null }),
    })
    const data = await res.json()
    if (!res.ok) { setMsg(data.error ?? 'Failed'); setSaving(false); return }
    if (data.judge && !judges.find((j: any) => j.id === data.judge.id)) setJudges(prev => [...prev, data.judge])
    if (data.assignment) setAssignments(prev => [...prev, data.assignment])
    setJudgeEmail(''); setJudgeSubmissionId(''); setSaving(false)
    setMsg('Judge assigned.')
  }

  async function addRubricCriterion() {
    if (!rubricName.trim()) return
    setSaving(true); setMsg(null)
    const res = await fetch(`/api/admin/hackathon/${event.id}/rubric`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: rubricName.trim(), description: rubricDesc.trim(), max_score: parseInt(rubricMax) || 10 }),
    })
    const data = await res.json()
    if (!res.ok) { setMsg(data.error ?? 'Failed'); setSaving(false); return }
    setRubric(prev => [...prev, data.criterion])
    setRubricName(''); setRubricDesc(''); setRubricMax('10'); setSaving(false)
    setMsg('Criterion added.')
  }

  const assignCountForSubmission = (subId: string) => assignments.filter((a: any) => a.submission_id === subId).length

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#f0e6d3]">{event.title} — Judging</h1>
          <p className="text-sm text-[#5a6278] mt-1">Manage submissions, judges, and scoring rubric.</p>
        </div>

        {kickoffEvent && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#1a1d2e] border border-[#252b3a] text-sm">
            <span className="text-[#5a6278]">Finals event for:</span>
            <a href={`/admin/hackathon/${kickoffEvent.id}`} className="text-[#7aa2f7] hover:underline font-medium">
              {kickoffEvent.title}
            </a>
            <span className="text-[#5a6278] text-xs">Submissions pulled from kickoff event.</span>
          </div>
        )}

        {finalsEvent && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#1a1d2e] border border-[#252b3a] text-sm">
            <span className="text-[#5a6278]">Kickoff event - finals at:</span>
            <a href={`/admin/hackathon/${finalsEvent.id}`} className="text-[#9ece6a] hover:underline font-medium">
              {finalsEvent.title}
            </a>
            <span className="text-[#5a6278] text-xs">Judging and bracket happen at the finals event.</span>
          </div>
        )}

        {msg && <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-lg">{msg}</div>}

        {/* Submissions toggle */}
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#13161f] border border-[#252b3a]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#c9d1e8]">Submissions</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${submissionsOpen ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
              {submissionsOpen ? 'Open' : 'Closed'}
            </span>
          </div>
          <button
            onClick={toggleSubmissions}
            disabled={togglingSubmissions}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${submissionsOpen ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'}`}
          >
            {togglingSubmissions ? 'Saving...' : submissionsOpen ? 'Close submissions' : 'Open submissions'}
          </button>
        </div>

        {/* Tab pills */}
        <div className="flex gap-2">
          {(['submissions', 'judges', 'rubric'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-[#f0e6d3] text-[#0b0e14]' : 'text-[#5a6278] hover:text-[#c9d1e8] bg-[#13161f] border border-[#252b3a]'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Submissions tab */}
        {tab === 'submissions' && (
          <div className="space-y-3">
            {submissions.length === 0 && <p className="text-[#5a6278] text-sm py-8 text-center">No submissions yet.</p>}
            {submissions.map((s: any) => (
              <Card key={s.id} className="bg-[#13161f] border-[#252b3a]">
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium text-[#c9d1e8] truncate">{s.title}</p>
                    <p className="text-xs text-[#5a6278]">Team: {s.hackathon_teams?.name ?? 'Unknown'}</p>
                    <div className="flex gap-3 mt-1">
                      {s.demo_url && <a href={s.demo_url} target="_blank" rel="noreferrer" className="text-xs text-[#7aa2f7] hover:underline">Demo</a>}
                      {s.deck_url && <a href={s.deck_url} target="_blank" rel="noreferrer" className="text-xs text-[#7aa2f7] hover:underline">Slides</a>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-medium capitalize ${STATUS_COLOR[s.sub_status] ?? 'text-[#5a6278]'}`}>{s.sub_status}</span>
                    <span className="text-xs text-[#5a6278]">{assignCountForSubmission(s.id)} judge(s)</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Judges tab */}
        {tab === 'judges' && (
          <div className="space-y-6">
            <Card className="bg-[#13161f] border-[#252b3a]">
              <CardContent className="pt-5 space-y-4">
                <p className="text-sm font-medium text-[#f0e6d3]">Add Judge & Assign Submission</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[#c9d1e8] text-xs">Member email</Label>
                    <Input value={judgeEmail} onChange={e => setJudgeEmail(e.target.value)}
                      placeholder="judge@example.com"
                      className="bg-[#0b0e14] border-[#252b3a] text-[#c9d1e8] placeholder:text-[#3a3f52] h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#c9d1e8] text-xs">Assign to submission (optional)</Label>
                    <select value={judgeSubmissionId} onChange={e => setJudgeSubmissionId(e.target.value)}
                      className="w-full h-8 px-2 bg-[#0b0e14] border border-[#252b3a] rounded-md text-sm text-[#c9d1e8]">
                      <option value="">— none —</option>
                      {submissions.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  </div>
                </div>
                <Button onClick={addJudge} disabled={saving || !judgeEmail.trim()} size="sm"
                  className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#f0e6d3]/90">
                  {saving ? 'Saving…' : 'Add Judge'}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#5a6278] uppercase tracking-wider">Current Judges ({judges.length})</p>
              {judges.length === 0 && <p className="text-[#5a6278] text-sm">No judges assigned yet.</p>}
              {judges.map((j: any) => (
                <div key={j.id} className="flex items-center justify-between px-3 py-2 bg-[#13161f] border border-[#252b3a] rounded-md">
                  <div>
                    <p className="text-sm text-[#c9d1e8]">{j.members?.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-[#5a6278]">{j.members?.email}</p>
                  </div>
                  <span className="text-xs text-[#5a6278]">{assignments.filter((a: any) => a.judge_id === j.id).length} assigned</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rubric tab */}
        {tab === 'rubric' && (
          <div className="space-y-6">
            <Card className="bg-[#13161f] border-[#252b3a]">
              <CardContent className="pt-5 space-y-4">
                <p className="text-sm font-medium text-[#f0e6d3]">Add Scoring Criterion</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-[#c9d1e8] text-xs">Name</Label>
                    <Input value={rubricName} onChange={e => setRubricName(e.target.value)} placeholder="Innovation"
                      className="bg-[#0b0e14] border-[#252b3a] text-[#c9d1e8] placeholder:text-[#3a3f52] h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-[#c9d1e8] text-xs">Description</Label>
                    <Input value={rubricDesc} onChange={e => setRubricDesc(e.target.value)} placeholder="Originality of idea"
                      className="bg-[#0b0e14] border-[#252b3a] text-[#c9d1e8] placeholder:text-[#3a3f52] h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#c9d1e8] text-xs">Max Score</Label>
                    <Input type="number" min={1} max={100} value={rubricMax} onChange={e => setRubricMax(e.target.value)}
                      className="bg-[#0b0e14] border-[#252b3a] text-[#c9d1e8] h-8 text-sm" />
                  </div>
                </div>
                <Button onClick={addRubricCriterion} disabled={saving || !rubricName.trim()} size="sm"
                  className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#f0e6d3]/90">
                  {saving ? 'Saving…' : 'Add Criterion'}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#5a6278] uppercase tracking-wider">Criteria ({rubric.length})</p>
              {rubric.length === 0 && <p className="text-[#5a6278] text-sm">No criteria yet. Add one above.</p>}
              {rubric.map((r: any, i: number) => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2.5 bg-[#13161f] border border-[#252b3a] rounded-md">
                  <div>
                    <p className="text-sm text-[#c9d1e8] font-medium">{i + 1}. {r.name}</p>
                    {r.description && <p className="text-xs text-[#5a6278]">{r.description}</p>}
                  </div>
                  <span className="text-xs font-mono text-[#f0e6d3]">/{r.max_score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
