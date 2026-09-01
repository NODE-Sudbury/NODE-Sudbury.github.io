'use client';

import { useState } from 'react';

type VoteCategory = 'best_demo' | 'most_innovative' | 'crowd_favorite';

interface VoteCounts {
  best_demo: number;
  most_innovative: number;
  crowd_favorite: number;
}

interface Showcase {
  id: string;
  title: string;
  tagline?: string;
  pitch?: string;
  description?: string;
  category?: string;
  demo_url?: string;
  repo_url?: string;
  slides_url?: string;
  video_url?: string;
  vote_count: number;
  vote_counts: VoteCounts;
  slot_order: number;
  status: string;
  member_id?: string;
  members?: { display_name?: string; avatar_url?: string } | null;
}

interface Props {
  eventId: string;
  eventSlug: string;
  slots: Showcase[];
  myVoteMap: Record<string, string[]>;
  memberId: string | null;
  myMemberShowcaseIds: string[];
  isEnded: boolean;
}

const CATEGORIES: Array<{
  key: VoteCategory;
  label: string;
  icon: string;
  color: string;
  activeBg: string;
  activeBorder: string;
  badgeActive: string;
}> = [
  {
    key: 'best_demo',
    label: 'Best Demo',
    icon: '🏆',
    color: '#fbbf24',
    activeBg: 'rgba(251,191,36,0.12)',
    activeBorder: '#d97706',
    badgeActive: '#b45309',
  },
  {
    key: 'most_innovative',
    label: 'Most Innovative',
    icon: '💡',
    color: '#a78bfa',
    activeBg: 'rgba(167,139,250,0.12)',
    activeBorder: '#7c3aed',
    badgeActive: '#5b21b6',
  },
  {
    key: 'crowd_favorite',
    label: 'Crowd Favorite',
    icon: '⭐',
    color: '#f472b6',
    activeBg: 'rgba(244,114,182,0.12)',
    activeBorder: '#be185d',
    badgeActive: '#9d174d',
  },
];

const PROJECT_CATEGORY_CLASSES: Record<string, string> = {
  web: 'bg-blue-900 text-blue-300',
  mobile: 'bg-purple-900 text-purple-300',
  ai: 'bg-sky-900 text-sky-300',
  hardware: 'bg-amber-900 text-amber-300',
  other: 'bg-gray-800 text-gray-300',
};

function totalVotes(vc: VoteCounts) {
  return vc.best_demo + vc.most_innovative + vc.crowd_favorite;
}

export function DemoBoard({
  eventSlug,
  slots: initialSlots,
  myVoteMap: initialVoteMap,
  memberId,
  myMemberShowcaseIds,
  isEnded,
}: Props) {
  const [slots, setSlots] = useState<Showcase[]>(initialSlots);
  const [myVoteMap, setMyVoteMap] = useState<Record<string, string[]>>(initialVoteMap);
  const myIds = new Set(myMemberShowcaseIds);

  // Registration form state
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ project_name: '', pitch: '', demo_url: '', repo_url: '' });
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regMsg, setRegMsg] = useState('');

  // Voting state: track which showcase+category combo is currently being processed
  const [pendingVote, setPendingVote] = useState<string | null>(null);

  const confirmedSlots = slots
    .filter(s => s.status === 'confirmed')
    .sort((a, b) =>
      isEnded
        ? totalVotes(b.vote_counts) - totalVotes(a.vote_counts)
        : a.slot_order - b.slot_order
    );

  // Leaderboard: top 3 per category (only entries with at least 1 vote)
  const leaderboard = CATEGORIES.map(cat => ({
    ...cat,
    top3: [...confirmedSlots]
      .sort((a, b) => b.vote_counts[cat.key] - a.vote_counts[cat.key])
      .filter(s => s.vote_counts[cat.key] > 0)
      .slice(0, 3),
  }));

  async function handleVote(showcaseId: string, category: VoteCategory) {
    if (!memberId || isEnded) return;
    const key = `${showcaseId}-${category}`;
    if (pendingVote) return; // one at a time

    const prevVotedCats = myVoteMap[showcaseId] ?? [];
    const wasVoted = prevVotedCats.includes(category);
    const delta = wasVoted ? -1 : 1;

    // Optimistic update
    setMyVoteMap(prev => ({
      ...prev,
      [showcaseId]: wasVoted
        ? (prev[showcaseId] ?? []).filter(c => c !== category)
        : [...(prev[showcaseId] ?? []), category],
    }));
    setSlots(prev =>
      prev.map(s =>
        s.id === showcaseId
          ? { ...s, vote_counts: { ...s.vote_counts, [category]: s.vote_counts[category] + delta } }
          : s
      )
    );

    setPendingVote(key);
    try {
      const res = await fetch(`/api/events/${eventSlug}/demos/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showcase_id: showcaseId, category }),
      });

      if (res.ok) {
        const { counts } = await res.json() as { voted: boolean; counts: VoteCounts };
        // Update with server-confirmed counts
        setSlots(prev => prev.map(s => s.id === showcaseId ? { ...s, vote_counts: counts } : s));
      } else {
        // Revert optimistic update
        setMyVoteMap(prev => ({
          ...prev,
          [showcaseId]: wasVoted
            ? [...(prev[showcaseId] ?? []), category]
            : (prev[showcaseId] ?? []).filter(c => c !== category),
        }));
        setSlots(prev =>
          prev.map(s =>
            s.id === showcaseId
              ? { ...s, vote_counts: { ...s.vote_counts, [category]: s.vote_counts[category] - delta } }
              : s
          )
        );
      }
    } finally {
      setPendingVote(null);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegSubmitting(true);
    setRegMsg('');
    try {
      const res = await fetch(`/api/events/${eventSlug}/demos/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });
      if (res.ok) {
        setRegMsg('Demo registered! It will appear on the board after organizer review.');
        setRegForm({ project_name: '', pitch: '', demo_url: '', repo_url: '' });
        setShowRegister(false);
      } else {
        const json = await res.json();
        setRegMsg(json.error ?? 'Registration failed.');
      }
    } catch {
      setRegMsg('Network error. Please try again.');
    } finally {
      setRegSubmitting(false);
    }
  }

  return (
    <div>
      {/* Register my demo CTA */}
      {memberId && !isEnded && (
        <div className="mb-6">
          {showRegister ? (
            <div
              style={{
                background: '#13161f',
                border: '1px solid #252b3a',
                borderRadius: 12,
                padding: '20px 24px',
                maxWidth: 520,
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold" style={{ color: '#e2e8f0' }}>Register Your Demo</h3>
                <button
                  onClick={() => { setShowRegister(false); setRegMsg(''); }}
                  style={{ color: '#8892a4', fontSize: 20, lineHeight: 1 }}
                  aria-label="Close registration form"
                >
                  x
                </button>
              </div>
              <form onSubmit={handleRegister} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#8892a4' }}>
                    Project Name *
                  </label>
                  <input
                    value={regForm.project_name}
                    onChange={e => setRegForm(f => ({ ...f, project_name: e.target.value }))}
                    required
                    placeholder="My Awesome Project"
                    style={{
                      background: '#0d1117',
                      border: '1px solid #252b3a',
                      color: '#e2e8f0',
                      borderRadius: 8,
                      padding: '8px 12px',
                      width: '100%',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#8892a4' }}>
                    One-line Pitch *
                  </label>
                  <input
                    value={regForm.pitch}
                    onChange={e => setRegForm(f => ({ ...f, pitch: e.target.value }))}
                    required
                    maxLength={120}
                    placeholder="What does it do, in one sentence?"
                    style={{
                      background: '#0d1117',
                      border: '1px solid #252b3a',
                      color: '#e2e8f0',
                      borderRadius: 8,
                      padding: '8px 12px',
                      width: '100%',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <div className="flex gap-3">
                  <div style={{ flex: 1 }}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#8892a4' }}>
                      Demo URL
                    </label>
                    <input
                      type="url"
                      value={regForm.demo_url}
                      onChange={e => setRegForm(f => ({ ...f, demo_url: e.target.value }))}
                      placeholder="https://..."
                      style={{
                        background: '#0d1117',
                        border: '1px solid #252b3a',
                        color: '#e2e8f0',
                        borderRadius: 8,
                        padding: '8px 12px',
                        width: '100%',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#8892a4' }}>
                      Repo URL
                    </label>
                    <input
                      type="url"
                      value={regForm.repo_url}
                      onChange={e => setRegForm(f => ({ ...f, repo_url: e.target.value }))}
                      placeholder="https://github.com/..."
                      style={{
                        background: '#0d1117',
                        border: '1px solid #252b3a',
                        color: '#e2e8f0',
                        borderRadius: 8,
                        padding: '8px 12px',
                        width: '100%',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
                {regMsg && (
                  <p style={{ fontSize: 13, color: regMsg.includes('failed') || regMsg.includes('error') ? '#f87171' : '#34d399' }}>
                    {regMsg}
                  </p>
                )}
                <div className="flex gap-2 mt-1">
                  <button
                    type="submit"
                    disabled={regSubmitting}
                    style={{
                      background: '#38bdf8',
                      color: '#0d1117',
                      borderRadius: 8,
                      padding: '8px 20px',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: regSubmitting ? 'not-allowed' : 'pointer',
                      opacity: regSubmitting ? 0.6 : 1,
                    }}
                  >
                    {regSubmitting ? 'Registering...' : 'Register Demo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowRegister(false); setRegMsg(''); }}
                    style={{
                      background: 'transparent',
                      border: '1px solid #252b3a',
                      color: '#8892a4',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowRegister(true)}
              style={{
                background: '#38bdf8',
                color: '#0d1117',
                borderRadius: 8,
                padding: '9px 20px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              + Register My Demo
            </button>
          )}
          {/* Success toast shown after form closes */}
          {!showRegister && regMsg && (
            <p className="mt-3 text-sm" style={{ color: '#34d399' }}>{regMsg}</p>
          )}
        </div>
      )}

      {/* Body: showcase list + leaderboard sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Showcase list */}
        <div className="flex-1 min-w-0">
          {isEnded && (
            <p className="text-sm font-semibold mb-4" style={{ color: '#fbbf24' }}>
              Event ended - results sorted by total audience votes.
            </p>
          )}
          {!isEnded && memberId && (
            <p className="text-sm mb-4" style={{ color: '#8892a4' }}>
              Cast a vote in each category per showcase independently. Each category is a separate vote.
            </p>
          )}
          {confirmedSlots.length === 0 && (
            <p className="text-center py-12" style={{ color: '#8892a4' }}>No demos confirmed yet.</p>
          )}
          <div className="flex flex-col gap-4">
            {confirmedSlots.map((slot, i) => {
              const isWinner = isEnded && i === 0;
              const isMine = myIds.has(slot.id);
              const myVotedCats = myVoteMap[slot.id] ?? [];
              const total = totalVotes(slot.vote_counts);

              return (
                <div
                  key={slot.id}
                  style={{
                    background: '#13161f',
                    border: `1px solid ${isWinner ? '#d97706' : '#252b3a'}`,
                    borderRadius: 12,
                    padding: '16px 20px',
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-start gap-3 mb-3">
                    {isWinner && <span style={{ fontSize: 24, marginTop: 2 }}>🏆</span>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold" style={{ color: '#e2e8f0' }}>{slot.title}</h3>
                        {isMine && (
                          <span
                            style={{
                              background: 'rgba(56,189,248,0.12)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56,189,248,0.25)',
                              borderRadius: 20,
                              padding: '1px 8px',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            Your demo
                          </span>
                        )}
                        {slot.category && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              PROJECT_CATEGORY_CLASSES[slot.category] ?? PROJECT_CATEGORY_CLASSES.other
                            }`}
                          >
                            {slot.category}
                          </span>
                        )}
                      </div>
                      {(slot.tagline || slot.pitch) && (
                        <p className="text-sm mb-1" style={{ color: '#38bdf8' }}>
                          {slot.tagline ?? slot.pitch}
                        </p>
                      )}
                      {slot.description && (
                        <p className="text-sm mb-2" style={{ color: '#8892a4' }}>
                          {slot.description}
                        </p>
                      )}
                      <div className="flex gap-3 flex-wrap mb-1">
                        {slot.demo_url && (
                          <a href={slot.demo_url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: 12 }} className="hover:underline">
                            Live Demo
                          </a>
                        )}
                        {slot.repo_url && (
                          <a href={slot.repo_url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: 12 }} className="hover:underline">
                            Repo
                          </a>
                        )}
                        {slot.slides_url && (
                          <a href={slot.slides_url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: 12 }} className="hover:underline">
                            Slides
                          </a>
                        )}
                        {slot.video_url && (
                          <a href={slot.video_url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: 12 }} className="hover:underline">
                            Video
                          </a>
                        )}
                      </div>
                      <p style={{ color: '#4b5563', fontSize: 12 }}>
                        by {slot.members?.display_name ?? 'Unknown'}
                      </p>
                    </div>
                    {isEnded && (
                      <div style={{ textAlign: 'right', minWidth: 52 }}>
                        <span className="font-bold text-base" style={{ color: '#e2e8f0' }}>{total}</span>
                        <br />
                        <span style={{ color: '#8892a4', fontSize: 11 }}>votes</span>
                      </div>
                    )}
                  </div>

                  {/* Vote buttons */}
                  <div
                    className="flex gap-2 flex-wrap pt-3"
                    style={{ borderTop: '1px solid #1e2436' }}
                  >
                    {CATEGORIES.map(cat => {
                      const hasVoted = myVotedCats.includes(cat.key);
                      const count = slot.vote_counts[cat.key];
                      const isProcessing = pendingVote === `${slot.id}-${cat.key}`;

                      if (isEnded) {
                        return (
                          <div
                            key={cat.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 12,
                              color: cat.color,
                              fontWeight: 600,
                            }}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.label}:</span>
                            <span style={{ color: '#e2e8f0' }}>{count}</span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={cat.key}
                          onClick={() => handleVote(slot.id, cat.key)}
                          disabled={!memberId || isProcessing || !!pendingVote}
                          aria-label={`${hasVoted ? 'Remove' : 'Cast'} ${cat.label} vote for ${slot.title}`}
                          aria-pressed={hasVoted}
                          style={{
                            background: hasVoted ? cat.activeBg : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${hasVoted ? cat.activeBorder : '#252b3a'}`,
                            color: hasVoted ? cat.color : '#8892a4',
                            borderRadius: 8,
                            padding: '5px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            cursor: memberId && !pendingVote ? 'pointer' : 'not-allowed',
                            opacity: isProcessing ? 0.55 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                          <span
                            style={{
                              background: hasVoted ? cat.badgeActive : '#1e2436',
                              color: hasVoted ? '#fff' : '#8892a4',
                              borderRadius: 9999,
                              padding: '0 6px',
                              fontSize: 11,
                              minWidth: 18,
                              textAlign: 'center',
                              display: 'inline-block',
                            }}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}

                    {!memberId && (
                      <p className="self-center" style={{ color: '#8892a4', fontSize: 12 }}>
                        <a href="/login" style={{ color: '#38bdf8' }} className="hover:underline">Sign in</a> to vote
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard sidebar */}
        <aside style={{ width: 256, flexShrink: 0 }} className="w-full lg:w-64">
          <div
            style={{
              background: '#13161f',
              border: '1px solid #252b3a',
              borderRadius: 12,
              padding: 16,
              position: 'sticky',
              top: 24,
            }}
          >
            <h2
              className="font-bold text-xs uppercase tracking-wider mb-4"
              style={{ color: '#8892a4', letterSpacing: '0.08em' }}
            >
              Leaderboard
            </h2>
            {leaderboard.map(cat => (
              <div key={cat.key} className="mb-5 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: 14 }}>{cat.icon}</span>
                  <span style={{ color: cat.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {cat.label}
                  </span>
                </div>
                {cat.top3.length === 0 ? (
                  <p style={{ color: '#4b5563', fontSize: 12 }}>No votes yet</p>
                ) : (
                  <ol className="flex flex-col gap-1">
                    {cat.top3.map((s, idx) => (
                      <li key={s.id} className="flex items-center gap-2">
                        <span
                          style={{
                            color: idx === 0 ? '#fbbf24' : '#8892a4',
                            fontSize: 11,
                            fontWeight: 700,
                            minWidth: 14,
                          }}
                        >
                          {idx + 1}.
                        </span>
                        <span
                          className="flex-1 truncate"
                          style={{ color: '#e2e8f0', fontSize: 12 }}
                          title={s.title}
                        >
                          {s.title}
                        </span>
                        <span style={{ color: cat.color, fontSize: 11, fontWeight: 700 }}>
                          {s.vote_counts[cat.key]}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
