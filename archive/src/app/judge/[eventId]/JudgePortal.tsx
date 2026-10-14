'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface RubricCriterion {
  id: string
  name: string
  description: string | null
  max_score: number
}

interface Submission {
  id: string
  title: string
  short_description: string | null
  demo_url: string | null
  deck_url: string | null
  sub_status: string
  hackathon_teams: { name: string } | null
}

interface Assignment {
  id: string
  submission_id: string
  hackathon_submissions: Submission | null
}

interface Score {
  id: string
  submission_id: string
  rubric_id: string
  score: number
  notes: string | null
}

interface Props {
  event: { id: string; title: string }
  judgeId: string
  assignments: Assignment[]
  rubric: RubricCriterion[]
  existingScores: Score[]
}

export default function JudgePortal({ event, judgeId, assignments, rubric, existingScores }: Props) {
  const [activeSubId, setActiveSubId] = useState<string | null>(assignments[0]?.submission_id ?? null)
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({})
  const [notes, setNotes] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const scoreMap: Record<string, Record<string, number>> = {}
    const noteMap: Record<string, Record<string, string>> = {}
    for (const s of existingScores) {
      if (!scoreMap[s.submission_id]) scoreMap[s.submission_id] = {}
      if (!noteMap[s.submission_id]) noteMap[s.submission_id] = {}
      scoreMap[s.submission_id][s.rubric_id] = s.score
      noteMap[s.submission_id][s.rubric_id] = s.notes ?? ''
    }
    setScores(scoreMap)
    setNotes(noteMap)
  }, [existingScores])

  function getScore(subId: string, rubricId: string) {
    return scores[subId]?.[rubricId] ?? 0
  }
  function getNotes(subId: string, rubricId: string) {
    return notes[subId]?.[rubricId] ?? ''
  }

  function setScoreFor(subId: string, rubricId: string, val: number) {
    setScores(prev => ({ ...prev, [subId]: { ...(prev[subId] ?? {}), [rubricId]: val } }))
  }
  function setNoteFor(subId: string, rubricId: string, val: string) {
    setNotes(prev => ({ ...prev, [subId]: { ...(prev[subId] ?? {}), [rubricId]: val } }))
  }

  function totalScore(subId: string) {
    return rubric.reduce((acc, r) => acc + (scores[subId]?.[r.id] ?? 0), 0)
  }
  function maxTotal() {
    return rubric.reduce((acc, r) => acc + r.max_score, 0)
  }

  async function submitScores(subId: string) {
    if (rubric.length === 0) return
    setSaving(true); setErr(null)
    const entries = rubric.map(r => ({
      rubric_id: r.id,
      score: getScore(subId, r.id),
      notes: getNotes(subId, r.id) || null,
    }))
    const res = await fetch('/api/judge/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, submission_id: subId, scores: entries }),
    })
    const data = await res.json()
    if (!res.ok) { setErr(data.error ?? 'Failed to save'); setSaving(false); return }
    setSavedAt(new Date().toLocaleTimeString())
    setSaving(false)
  }

  const activeSub = assignments.find(a => a.submission_id === activeSubId)?.hackathon_submissions ?? null

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#f0e6d3]">{event.title} - Judge Portal</h1>
          <p className="text-sm text-[#5a6278] mt-1">Score your assigned submissions below.</p>
        </div>

        {assignments.length === 0 && (
          <p className="text-[#5a6278] text-center py-20">You have no submissions assigned yet. Check back later.</p>
        )}

        {assignments.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar - submission list */}
            <div className="lg:w-56 shrink-0 space-y-2">
              <p className="text-xs font-semibold text-[#5a6278] uppercase tracking-wider mb-3">Assigned ({assignments.length})</p>
              {assignments.map(a => {
                const sub = a.hackathon_submissions
                const isActive = a.submission_id === activeSubId
                const scored = rubric.every(r => (scores[a.submission_id]?.[r.id] ?? 0) > 0)
                return (
                  <button key={a.id}
                    onClick={() => { setActiveSubId(a.submission_id); setErr(null); setSavedAt(null) }}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm border transition-colors ${isActive ? 'bg-[#1a1f2c] border-[#f0e6d3]/30 text-[#f0e6d3]' : 'bg-[#13161f] border-[#252b3a] text-[#c9d1e8] hover:border-[#3a3f52]'}`}>
                    <p className="font-medium truncate">{sub?.title ?? 'Untitled'}</p>
                    <p className="text-xs text-[#5a6278] mt-0.5">{sub?.hackathon_teams?.name ?? 'Unknown'}</p>
                    {scored && <span className="text-xs text-green-400">Scored</span>}
                  </button>
                )
              })}
            </div>

            {/* Main scoring panel */}
            <div className="flex-1 min-w-0">
              {activeSub ? (
                <div className="space-y-6">
                  <Card className="bg-[#13161f] border-[#252b3a]">
                    <CardContent className="p-5 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-semibold text-[#f0e6d3]">{activeSub.title}</h2>
                          <p className="text-sm text-[#5a6278]">Team: {activeSub.hackathon_teams?.name ?? 'Unknown'}</p>
                        </div>
                        <span className="text-sm font-mono text-[#f0e6d3] shrink-0">{totalScore(activeSubId!)} / {maxTotal()}</span>
                      </div>
                      {activeSub.short_description && (
                        <p className="text-sm text-[#c9d1e8] mt-2">{activeSub.short_description}</p>
                      )}
                      <div className="flex gap-3 mt-2">
                        {activeSub.demo_url && <a href={activeSub.demo_url} target="_blank" rel="noreferrer" className="text-xs text-[#7aa2f7] hover:underline">Live Demo</a>}
                        {activeSub.deck_url && <a href={activeSub.deck_url} target="_blank" rel="noreferrer" className="text-xs text-[#7aa2f7] hover:underline">Slides</a>}
                      </div>
                    </CardContent>
                  </Card>

                  {rubric.length === 0 && (
                    <p className="text-[#5a6278] text-sm text-center py-8">No rubric criteria defined yet. Contact the event organizer.</p>
                  )}

                  {rubric.map(r => (
                    <Card key={r.id} className="bg-[#13161f] border-[#252b3a]">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-[#f0e6d3]">{r.name}</p>
                            {r.description && <p className="text-xs text-[#5a6278] mt-0.5">{r.description}</p>}
                          </div>
                          <span className="text-lg font-mono font-bold text-[#f0e6d3] shrink-0">
                            {getScore(activeSubId!, r.id)}<span className="text-sm font-normal text-[#5a6278]">/{r.max_score}</span>
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={r.max_score}
                          step={1}
                          value={getScore(activeSubId!, r.id)}
                          onChange={e => setScoreFor(activeSubId!, r.id, parseInt(e.target.value))}
                          className="w-full accent-[#f0e6d3]"
                        />
                        <div className="space-y-1">
                          <Label className="text-[#5a6278] text-xs">Notes (optional)</Label>
                          <textarea
                            rows={2}
                            value={getNotes(activeSubId!, r.id)}
                            onChange={e => setNoteFor(activeSubId!, r.id, e.target.value)}
                            placeholder="Add scoring notes..."
                            className="w-full px-3 py-2 bg-[#0b0e14] border border-[#252b3a] rounded-md text-sm text-[#c9d1e8] placeholder:text-[#3a3f52] resize-none focus:outline-none focus:border-[#5a6278]"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {err && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg">{err}</p>}
                  {savedAt && <p className="text-sm text-green-400">Saved at {savedAt}</p>}

                  {rubric.length > 0 && (
                    <Button onClick={() => submitScores(activeSubId!)} disabled={saving}
                      className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#f0e6d3]/90">
                      {saving ? 'Saving...' : 'Save Scores'}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-[#5a6278] text-center py-20">Select a submission from the list.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
