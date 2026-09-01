'use client'

import { useEffect, useState } from 'react'

interface Props {
  kickoffAt: string | null
  hackingStartsAt: string | null
  teamsLockAt: string | null
  submissionDeadline: string | null
  judgingStartsAt: string | null
  resultsAt: string | null
  eventStartsAt: string
}

interface Phase {
  label: string
  countdownTo: Date | null
  phaseStart: Date
  phaseEnd: Date | null
  done: boolean
}

function resolvePhase(now: Date, props: Props): Phase {
  const {
    kickoffAt,
    hackingStartsAt,
    teamsLockAt,
    submissionDeadline,
    judgingStartsAt,
    resultsAt,
    eventStartsAt,
  } = props

  const t = (s: string | null) => (s ? new Date(s) : null)

  const kickoff = t(kickoffAt)
  const hacking = t(hackingStartsAt)
  const lock = t(teamsLockAt)
  const submit = t(submissionDeadline)
  const judging = t(judgingStartsAt)
  const results = t(resultsAt)
  const eventStart = new Date(eventStartsAt)

  // After results
  if (results && now >= results) {
    return { label: 'Results announced', countdownTo: null, phaseStart: results, phaseEnd: null, done: true }
  }

  // Judging phase
  if (judging && now >= judging) {
    return { label: 'Judging', countdownTo: results, phaseStart: judging, phaseEnd: results, done: false }
  }

  // Submissions closed
  if (submit && now >= submit) {
    const end = judging ?? results
    return { label: 'Submissions closed - judging soon', countdownTo: end, phaseStart: submit, phaseEnd: end, done: false }
  }

  // Building phase (teams locked, building to submission)
  if (lock && now >= lock) {
    return { label: 'Building', countdownTo: submit, phaseStart: lock, phaseEnd: submit, done: false }
  }

  // Hacking phase (teams forming, hacking begins)
  if (hacking && now >= hacking) {
    const end = lock ?? submit
    return { label: 'Hacking', countdownTo: end, phaseStart: hacking, phaseEnd: end, done: false }
  }

  // Kickoff phase (event started, waiting for hacking to begin)
  if (kickoff && now >= kickoff) {
    const end = hacking ?? lock ?? submit
    return { label: 'Kickoff', countdownTo: end, phaseStart: kickoff, phaseEnd: end, done: false }
  }

  // Before kickoff or event start - registration open
  const registrationEnd = kickoff ?? eventStart
  return {
    label: 'Registration open',
    countdownTo: registrationEnd,
    phaseStart: new Date(0),
    phaseEnd: registrationEnd,
    done: false,
  }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00d 00h 00m 00s'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
}

function calcProgress(now: Date, phase: Phase): number {
  if (phase.done) return 100
  if (!phase.phaseEnd || !phase.countdownTo) return 0
  const start = phase.phaseStart.getTime()
  const end = phase.phaseEnd.getTime()
  const span = end - start
  if (span <= 0) return 0
  const elapsed = now.getTime() - start
  return Math.min(100, Math.max(0, (elapsed / span) * 100))
}

export default function HackathonCountdown(props: Props) {
  const [now, setNow] = useState<Date>(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const phase = resolvePhase(now, props)
  const remaining = phase.countdownTo ? phase.countdownTo.getTime() - now.getTime() : 0
  const progress = calcProgress(now, phase)

  const digits = phase.done
    ? null
    : phase.countdownTo
    ? formatCountdown(remaining)
    : null

  return (
    <div className="bg-[#13161f] border border-[#252b3a] rounded-xl px-6 py-5 mb-8">
      <p className="text-xs font-mono text-[#5a6278] uppercase tracking-widest mb-1">Current phase</p>
      <p className="text-base font-semibold text-[#38bdf8] mb-3">{phase.label}</p>

      {digits && (
        <p className="font-mono text-2xl font-bold text-white tracking-tight mb-4">{digits}</p>
      )}

      {phase.done && (
        <p className="font-mono text-2xl font-bold text-[#9ece6a] tracking-tight mb-4">Complete</p>
      )}

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-[#252b3a] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${progress}%`,
            background: phase.done ? '#9ece6a' : '#38bdf8',
          }}
        />
      </div>

      {phase.countdownTo && !phase.done && (
        <p className="text-xs text-[#5a6278] mt-2">
          Until: {phase.countdownTo.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  )
}
