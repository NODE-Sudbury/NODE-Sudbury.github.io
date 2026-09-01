'use client';

import { useState, useCallback } from 'react';

interface Listing {
  id: string;
  title: string;
  employment_type: string;
  location_type: string;
  description: string | null;
  salary_range: string | null;
  apply_url: string | null;
}

interface Booth {
  id: string;
  company_name: string;
  logo_url: string | null;
  booth_number: string | null;
  description: string | null;
  website_url: string | null;
  industries: string[];
  is_hiring: boolean;
  job_fair_listings: Listing[];
}

interface Meeting {
  id: string;
  time_slot: string;
  status: string;
  notes: string | null;
  job_fair_booths: { company_name: string; booth_number: string | null; logo_url: string | null } | null;
}

interface MeetingSlot {
  id: string;
  starts_at: string;
  booked_at: string | null;
  is_available: boolean;
  booked_by: { hidden: true } | { id: string; full_name: string | null; avatar_url: string | null } | null;
}

interface Props {
  event: { id: string; title: string; slug: string };
  booths: Booth[];
  myMeetings: Meeting[];
  isAuthenticated: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-Time', part_time: 'Part-Time', contract: 'Contract',
  internship: 'Internship', coop: 'Co-op',
};
const LOC_LABELS: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', in_person: 'In-Person' };

function statusChip(status: string) {
  const map: Record<string, string> = {
    requested: 'bg-yellow-500/20 text-yellow-300',
    confirmed: 'bg-green-500/20 text-green-300',
    cancelled: 'bg-red-500/20 text-red-300',
  };
  return map[status] ?? 'bg-gray-700 text-gray-300';
}

function formatSlotTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Toronto',
    });
  } catch {
    return iso;
  }
}

export function JobFairClient({ event, booths, myMeetings, isAuthenticated }: Props) {
  const [tab, setTab] = useState<'employers' | 'jobs' | 'meetings'>('employers');
  const [typeFilter, setTypeFilter] = useState('');
  const [locFilter, setLocFilter] = useState('');

  // Legacy meeting booking state (job_fair_meetings table)
  const [bookingBooth, setBookingBooth] = useState<Booth | null>(null);
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Slot booking state (job_fair_meeting_slots table)
  const [slotBooth, setSlotBooth] = useState<Booth | null>(null);
  const [slots, setSlots] = useState<MeetingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [bookingSlot, setBookingSlot] = useState(false);

  const [toast, setToast] = useState<{ text: string; ok: boolean }>({ text: '', ok: true });

  function showToast(text: string, ok = true) {
    setToast({ text, ok });
    setTimeout(() => setToast({ text: '', ok: true }), 5000);
  }

  const allListings = booths.flatMap(b => (b.job_fair_listings ?? []).map(l => ({ ...l, booth: b })));
  const filtered = allListings.filter(l =>
    (!typeFilter || l.employment_type === typeFilter) &&
    (!locFilter || l.location_type === locFilter)
  );

  // ---- Legacy meeting booking ----
  async function bookMeeting() {
    if (!timeSlot) return;
    setSaving(true);
    const res = await fetch(`/api/job-fair/${event.id}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booth_id: bookingBooth!.id, time_slot: timeSlot, notes }),
    });
    setSaving(false);
    if (res.ok) {
      setBookingBooth(null);
      setTimeSlot('');
      setNotes('');
      showToast('Meeting requested!');
    } else {
      const err = await res.json();
      showToast(err.error ?? 'Failed to book', false);
    }
  }

  const TIME_SLOTS = ['10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45',
    '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45'];
  const bookedSlots = myMeetings
    .filter(m => m.job_fair_booths && bookingBooth && m.job_fair_booths.company_name === bookingBooth.company_name)
    .map(m => m.time_slot);

  // ---- 15-min slot booking ----
  const openSlotModal = useCallback(async (booth: Booth) => {
    setSlotBooth(booth);
    setSelectedSlotId('');
    setSlots([]);
    setSlotsLoading(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/job-fair/slots?booth_id=${booth.id}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots ?? []);
      } else {
        showToast('Could not load slots - try again shortly', false);
      }
    } catch {
      showToast('Could not load slots - try again shortly', false);
    } finally {
      setSlotsLoading(false);
    }
  }, [event.slug]);

  async function bookSlot() {
    if (!selectedSlotId || !slotBooth) return;
    setBookingSlot(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/job-fair/slots/${selectedSlotId}/book`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setSlotBooth(null);
        setSelectedSlotId('');
        showToast(data.message ?? `Meeting booked with ${slotBooth.company_name}!`);
        // Refresh slot list would require re-fetching; close modal is sufficient UX
      } else {
        showToast(data.error ?? 'Failed to book slot', false);
        // Refresh slots so the user sees the updated state
        openSlotModal(slotBooth);
      }
    } finally {
      setBookingSlot(false);
    }
  }

  const availableSlots = slots.filter(s => s.is_available);

  return (
    <div className="min-h-screen text-[#e2e8f0]" style={{ background: '#0d1117' }}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-white mb-1">{event.title}</h1>
        <p className="mb-8" style={{ color: '#8892a4' }}>Job Fair</p>

        <div className="flex gap-2 mb-8 pb-2" style={{ borderBottom: '1px solid #252b3a' }}>
          {(['employers', 'jobs', 'meetings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-t text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 text-[#38bdf8]'
                  : 'hover:text-[#e2e8f0]'
              }`}
              style={tab === t
                ? { background: 'rgba(56,189,248,0.1)', borderColor: '#38bdf8', color: '#38bdf8' }
                : { color: '#8892a4' }
              }>
              {t === 'meetings' ? 'My Meetings' : t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'employers' && ` (${booths.length})`}
              {t === 'jobs' && ` (${allListings.length})`}
              {t === 'meetings' && ` (${myMeetings.length})`}
            </button>
          ))}
        </div>

        {/* Employers tab */}
        {tab === 'employers' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {booths.length === 0 && (
              <p className="col-span-3" style={{ color: '#8892a4' }}>No employers registered yet.</p>
            )}
            {booths.map(b => (
              <div key={b.id} className="rounded-xl p-5 flex flex-col gap-3"
                style={{ background: '#13161f', border: '1px solid #252b3a' }}>
                <div className="flex items-center gap-3">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.company_name}
                      className="w-12 h-12 rounded-lg object-contain bg-white p-1" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold"
                      style={{ background: '#252b3a', color: '#8892a4' }}>
                      {b.company_name[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">{b.company_name}</p>
                    {b.booth_number && (
                      <p className="text-xs" style={{ color: '#8892a4' }}>Booth {b.booth_number}</p>
                    )}
                  </div>
                </div>

                {b.industries?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {b.industries.map(i => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
                        {i}
                      </span>
                    ))}
                  </div>
                )}

                {b.description && (
                  <p className="text-sm line-clamp-2" style={{ color: '#8892a4' }}>{b.description}</p>
                )}
                <p className="text-xs" style={{ color: '#8892a4' }}>
                  {b.job_fair_listings?.length ?? 0} open positions
                </p>

                <div className="flex flex-wrap gap-2 mt-auto items-center">
                  {b.website_url && (
                    <a href={b.website_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs hover:underline" style={{ color: '#38bdf8' }}>
                      Website
                    </a>
                  )}

                  {isAuthenticated && (
                    <>
                      {/* 15-min slot booking - primary CTA */}
                      <button
                        onClick={() => openSlotModal(b)}
                        className="ml-auto text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: '#38bdf8', color: '#0d1117' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#7dd3fc')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#38bdf8')}>
                        Book a 15-min chat
                      </button>

                      {/* Legacy general meeting request */}
                      <button
                        onClick={() => setBookingBooth(b)}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={{ border: '1px solid #252b3a', color: '#8892a4' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#8892a4')}>
                        Request Meeting
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Jobs tab */}
        {tab === 'jobs' && (
          <div>
            <div className="flex gap-3 mb-6 flex-wrap">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="text-sm rounded-lg px-3 py-2"
                style={{ background: '#13161f', border: '1px solid #252b3a', color: '#e2e8f0' }}>
                <option value="">All Types</option>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select value={locFilter} onChange={e => setLocFilter(e.target.value)}
                className="text-sm rounded-lg px-3 py-2"
                style={{ background: '#13161f', border: '1px solid #252b3a', color: '#e2e8f0' }}>
                <option value="">All Locations</option>
                {Object.entries(LOC_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-3">
              {filtered.length === 0 && (
                <p style={{ color: '#8892a4' }}>No listings match your filters.</p>
              )}
              {filtered.map(l => (
                <div key={l.id} className="rounded-xl p-5"
                  style={{ background: '#13161f', border: '1px solid #252b3a' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{l.title}</p>
                      <p className="text-sm" style={{ color: '#8892a4' }}>{l.booth.company_name}</p>
                    </div>
                    {l.apply_url && (
                      <a href={l.apply_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
                        style={{ background: '#38bdf8', color: '#0d1117' }}>
                        Apply
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: '#252b3a', color: '#e2e8f0' }}>
                      {TYPE_LABELS[l.employment_type] ?? l.employment_type}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: '#252b3a', color: '#e2e8f0' }}>
                      {LOC_LABELS[l.location_type] ?? l.location_type}
                    </span>
                    {l.salary_range && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                        {l.salary_range}
                      </span>
                    )}
                  </div>
                  {l.description && (
                    <p className="text-sm mt-3 line-clamp-3" style={{ color: '#8892a4' }}>{l.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Meetings tab */}
        {tab === 'meetings' && (
          <div className="flex flex-col gap-3">
            {!isAuthenticated && (
              <p style={{ color: '#8892a4' }}>Sign in to view your meetings.</p>
            )}
            {isAuthenticated && myMeetings.length === 0 && (
              <p style={{ color: '#8892a4' }}>
                No meetings booked yet. Visit the Employers tab to book a 15-min chat.
              </p>
            )}
            {myMeetings.map(m => (
              <div key={m.id} className="rounded-xl p-5 flex items-center gap-4"
                style={{ background: '#13161f', border: '1px solid #252b3a' }}>
                <div className="flex-1">
                  <p className="font-semibold text-white">{m.job_fair_booths?.company_name}</p>
                  {m.job_fair_booths?.booth_number && (
                    <p className="text-xs" style={{ color: '#8892a4' }}>Booth {m.job_fair_booths.booth_number}</p>
                  )}
                  <p className="text-sm mt-1" style={{ color: '#8892a4' }}>{m.time_slot}</p>
                  {m.notes && <p className="text-xs mt-1" style={{ color: '#8892a4' }}>{m.notes}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusChip(m.status)}`}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 15-min slot booking modal */}
      {slotBooth && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md"
            style={{ background: '#13161f', border: '1px solid #252b3a' }}>
            <h2 className="text-lg font-bold text-white mb-1">Book a 15-min Chat</h2>
            <p className="text-sm mb-5" style={{ color: '#8892a4' }}>
              with <span className="text-white font-medium">{slotBooth.company_name}</span>
            </p>

            {slotsLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#38bdf8', borderTopColor: 'transparent' }} />
              </div>
            )}

            {!slotsLoading && slots.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: '#8892a4' }}>
                  No meeting slots have been set up for this booth yet.
                </p>
                <p className="text-xs mt-2" style={{ color: '#8892a4' }}>
                  Check back closer to the event date.
                </p>
              </div>
            )}

            {!slotsLoading && slots.length > 0 && (
              <>
                <p className="text-xs mb-3" style={{ color: '#8892a4' }}>
                  {availableSlots.length} slot{availableSlots.length !== 1 ? 's' : ''} available - select a time
                </p>
                <div className="grid grid-cols-3 gap-2 mb-6 max-h-64 overflow-y-auto pr-1">
                  {slots.map(s => {
                    const available = s.is_available;
                    const selected = selectedSlotId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => available && setSelectedSlotId(s.id)}
                        disabled={!available}
                        className="text-xs py-2 px-1 rounded-lg border transition-colors text-center"
                        style={{
                          borderColor: !available
                            ? '#1e2535'
                            : selected
                              ? '#38bdf8'
                              : '#252b3a',
                          background: !available
                            ? 'transparent'
                            : selected
                              ? 'rgba(56,189,248,0.15)'
                              : 'transparent',
                          color: !available
                            ? '#3a4256'
                            : selected
                              ? '#38bdf8'
                              : '#e2e8f0',
                          cursor: !available ? 'not-allowed' : 'pointer',
                        }}>
                        {formatSlotTime(s.starts_at)}
                        {!available && (
                          <span className="block text-[10px] mt-0.5" style={{ color: '#3a4256' }}>Taken</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setSlotBooth(null); setSelectedSlotId(''); }}
                    className="flex-1 py-2 rounded-lg text-sm transition-colors"
                    style={{ border: '1px solid #252b3a', color: '#8892a4' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#8892a4')}>
                    Cancel
                  </button>
                  <button
                    onClick={bookSlot}
                    disabled={!selectedSlotId || bookingSlot}
                    className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    style={{ background: '#38bdf8', color: '#0d1117' }}>
                    {bookingSlot ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </>
            )}

            {!slotsLoading && slots.length === 0 && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setSlotBooth(null)}
                  className="px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ border: '1px solid #252b3a', color: '#8892a4' }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legacy meeting booking modal */}
      {bookingBooth && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md"
            style={{ background: '#13161f', border: '1px solid #252b3a' }}>
            <h2 className="text-lg font-bold text-white mb-1">Request Meeting</h2>
            <p className="text-sm mb-5" style={{ color: '#8892a4' }}>{bookingBooth.company_name}</p>

            <label className="block text-sm mb-2" style={{ color: '#e2e8f0' }}>Preferred Time</label>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {TIME_SLOTS.map(s => (
                <button key={s} onClick={() => setTimeSlot(s)}
                  disabled={bookedSlots.includes(s)}
                  className="text-xs py-1.5 rounded-lg border transition-colors"
                  style={{
                    borderColor: bookedSlots.includes(s) ? '#1e2535' : timeSlot === s ? '#38bdf8' : '#252b3a',
                    background: timeSlot === s ? 'rgba(56,189,248,0.15)' : 'transparent',
                    color: bookedSlots.includes(s) ? '#3a4256' : timeSlot === s ? '#38bdf8' : '#e2e8f0',
                    cursor: bookedSlots.includes(s) ? 'not-allowed' : 'pointer',
                  }}>
                  {s}
                </button>
              ))}
            </div>

            <label className="block text-sm mb-2" style={{ color: '#e2e8f0' }}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none mb-5"
              style={{ background: '#0d1117', border: '1px solid #252b3a', color: '#e2e8f0' }}
              rows={3} placeholder="What would you like to discuss?" />

            <div className="flex gap-3">
              <button onClick={() => setBookingBooth(null)}
                className="flex-1 py-2 rounded-lg text-sm transition-colors"
                style={{ border: '1px solid #252b3a', color: '#8892a4' }}>
                Cancel
              </button>
              <button onClick={bookMeeting} disabled={!timeSlot || saving}
                className="flex-1 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                style={{ background: '#38bdf8', color: '#0d1117' }}>
                {saving ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast.text && (
        <div className="fixed bottom-4 right-4 text-sm px-4 py-3 rounded-xl shadow-2xl z-50 max-w-xs"
          style={{
            background: '#13161f',
            border: `1px solid ${toast.ok ? '#38bdf8' : '#ef4444'}`,
            color: toast.ok ? '#e2e8f0' : '#fca5a5',
          }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
