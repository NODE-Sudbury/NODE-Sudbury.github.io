'use client';

import { useState } from 'react';

interface CurriculumItem { week: number; title: string; description?: string; resource_url?: string }
interface Cohort {
  id: string;
  name: string;
  topic: string;
  description?: string;
  max_members: number;
  is_open: boolean;
  curriculum: CurriculumItem[];
  member_count: number;
}
interface Progress { week_number: number; completed: boolean }
interface CohortMember { member_id: string; members: { display_name: string; avatar_url?: string } }

interface AttendanceStreak {
  current_streak: number;
  longest_streak: number;
  last_event_date: string | null;
}

interface Props {
  cohorts: Cohort[];
  myMembership: { cohort_id: string } | null;
  myProgress: Progress[];
  cohortMembers: CohortMember[];
  isLoggedIn: boolean;
  streak?: AttendanceStreak | null;
}

export default function StudyGroupHub({ cohorts, myMembership, myProgress, cohortMembers, isLoggedIn, streak }: Props) {
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState<Progress[]>(myProgress);
  const [membership, setMembership] = useState(myMembership);

  const myCohort = membership ? cohorts.find(c => c.id === membership.cohort_id) : null;

  async function handleJoin(cohortId: string) {
    setJoining(true);
    const res = await fetch(`/api/study-group/${cohortId}/join`, { method: 'POST' });
    if (res.ok) setMembership({ cohort_id: cohortId });
    setJoining(false);
  }

  async function handleLeave(cohortId: string) {
    setLeaving(true);
    const res = await fetch(`/api/study-group/${cohortId}/leave`, { method: 'DELETE' });
    if (res.ok) setMembership(null);
    setLeaving(false);
  }

  async function toggleWeek(cohortId: string, week: number, completed: boolean) {
    const res = await fetch(`/api/study-group/${cohortId}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_number: week, completed }),
    });
    if (res.ok) {
      setProgress(prev => {
        const next = prev.filter(p => p.week_number !== week);
        return [...next, { week_number: week, completed }];
      });
    }
  }

  if (myCohort) {
    const myCompletedWeeks = new Set(progress.filter(p => p.completed).map(p => p.week_number));
    const completionPct = myCohort.curriculum.length
      ? Math.round((myCompletedWeeks.size / myCohort.curriculum.length) * 100)
      : 0;

    return (
      <div className="space-y-6">
        {streak && streak.current_streak > 0 && (
          <div className="flex items-center gap-3 bg-sky-950/60 border border-sky-700/40 rounded-xl px-4 py-3">
            <span className="text-2xl" aria-hidden="true">🔥</span>
            <div>
              <p className="text-sky-300 font-semibold text-sm">
                Your streak: {streak.current_streak} {streak.current_streak === 1 ? 'event' : 'events'}
              </p>
              <p className="text-sky-500 text-xs mt-0.5">
                {streak.current_streak >= streak.longest_streak
                  ? 'This is your longest streak - keep it going!'
                  : `${streak.longest_streak - streak.current_streak} more to beat your record of ${streak.longest_streak}`}
              </p>
            </div>
          </div>
        )}
        {streak && streak.current_streak === 0 && (
          <div className="flex items-center gap-3 bg-gray-800/60 border border-gray-700/40 rounded-xl px-4 py-3">
            <span className="text-2xl" aria-hidden="true">🔥</span>
            <div>
              <p className="text-gray-300 font-semibold text-sm">Start your streak</p>
              <p className="text-gray-500 text-xs mt-0.5">Attend your first session to start a streak!</p>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4 bg-gray-800 rounded-xl p-5">
          <div>
            <h2 className="text-xl font-bold text-white">{myCohort.name}</h2>
            <p className="text-sky-400 text-sm mt-1">{myCohort.topic}</p>
            {myCohort.description && <p className="text-gray-400 text-sm mt-2">{myCohort.description}</p>}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-gray-500">{cohortMembers.length} / {myCohort.max_members} members</span>
              <span className="text-xs text-gray-500">{completionPct}% complete</span>
            </div>
          </div>
          <button
            onClick={() => handleLeave(myCohort.id)}
            disabled={leaving}
            className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 rounded-lg px-3 py-1.5 shrink-0"
          >
            {leaving ? 'Leaving...' : 'Leave Cohort'}
          </button>
        </div>

        {myCohort.curriculum.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Curriculum</h3>
            <div className="space-y-2">
              {myCohort.curriculum.map((item) => {
                const done = myCompletedWeeks.has(item.week);
                return (
                  <div key={item.week} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-700/50">
                    <button
                      onClick={() => toggleWeek(myCohort.id, item.week, !done)}
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        done ? 'bg-sky-500 border-sky-500' : 'border-gray-500 hover:border-sky-400'
                      }`}
                      aria-label={done ? `Mark week ${item.week} incomplete` : `Mark week ${item.week} complete`}
                    >
                      {done && <span className="text-black text-xs font-bold">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono">W{item.week}</span>
                        <span className={`text-sm font-medium ${done ? 'line-through text-gray-500' : 'text-white'}`}>
                          {item.title}
                        </span>
                      </div>
                      {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                      {item.resource_url && (
                        <a href={item.resource_url} target="_blank" rel="noopener noreferrer"
                           className="text-xs text-sky-400 hover:underline mt-1 inline-block">
                          Open resource
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {cohortMembers.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Members ({cohortMembers.length})
            </h3>
            <div className="flex flex-wrap gap-3">
              {cohortMembers.map((m) => (
                <div key={m.member_id} className="flex items-center gap-2">
                  {m.members.avatar_url ? (
                    <img src={m.members.avatar_url} alt={m.members.display_name}
                         className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-sky-900 flex items-center justify-center text-xs font-bold text-sky-300">
                      {m.members.display_name?.[0] ?? '?'}
                    </div>
                  )}
                  <span className="text-sm text-gray-300">{m.members.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Available Cohorts</h2>
      {cohorts.length === 0 && (
        <p className="text-gray-500">No cohorts available yet. Check back soon.</p>
      )}
      {cohorts.map((cohort) => (
        <div key={cohort.id} className="bg-gray-800 rounded-xl p-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">{cohort.name}</h3>
            <p className="text-sky-400 text-sm mt-0.5">{cohort.topic}</p>
            {cohort.description && <p className="text-gray-400 text-sm mt-1">{cohort.description}</p>}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-gray-500">{cohort.member_count} / {cohort.max_members} members</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${cohort.is_open ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                {cohort.is_open ? 'Open' : 'Closed'}
              </span>
              <span className="text-xs text-gray-500">{cohort.curriculum.length} weeks</span>
            </div>
          </div>
          {isLoggedIn && cohort.is_open && cohort.member_count < cohort.max_members && (
            <button
              onClick={() => handleJoin(cohort.id)}
              disabled={joining}
              className="shrink-0 bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm px-4 py-2 rounded-lg"
            >
              {joining ? 'Joining...' : 'Join Cohort'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
