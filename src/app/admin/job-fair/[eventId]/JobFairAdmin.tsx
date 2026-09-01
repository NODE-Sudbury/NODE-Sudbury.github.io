'use client';

import { useState } from 'react';

interface Listing { id: string; title: string; employment_type: string; location_type: string; salary_range: string | null; apply_url: string | null; }
interface Meeting { id: string; time_slot: string; status: string; notes: string | null; }
interface Booth {
  id: string; company_name: string; logo_url: string | null; booth_number: string | null;
  description: string | null; website_url: string | null; industries: string[]; is_hiring: boolean;
  contact_name: string | null; contact_email: string | null; status: string;
  job_fair_listings: Listing[]; job_fair_meetings: Meeting[];
}

interface Props { eventId: string; eventTitle: string; initialBooths: Booth[]; }

export function JobFairAdmin({ eventId, eventTitle, initialBooths }: Props) {
  const [tab, setTab] = useState<'booths' | 'listings' | 'meetings'>('booths');
  const [booths, setBooths] = useState<Booth[]>(initialBooths);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ company_name: '', booth_number: '', description: '', website_url: '', logo_url: '', industries: '', contact_name: '', contact_email: '', is_hiring: true });
  const [listingForm, setListingForm] = useState({ booth_id: '', title: '', employment_type: 'full_time', location_type: 'hybrid', description: '', salary_range: '', apply_url: '' });

  async function addBooth() {
    setSaving(true);
    const res = await fetch(`/api/admin/job-fair/${eventId}/booths`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, industries: form.industries.split(',').map(s => s.trim()).filter(Boolean) }),
    });
    if (res.ok) {
      const nb = await res.json();
      setBooths(prev => [...prev, { ...nb, job_fair_listings: [], job_fair_meetings: [] }]);
      setForm({ company_name: '', booth_number: '', description: '', website_url: '', logo_url: '', industries: '', contact_name: '', contact_email: '', is_hiring: true });
    }
    setSaving(false);
  }

  async function updateStatus(boothId: string, status: string) {
    await fetch(`/api/admin/job-fair/${eventId}/booths/${boothId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    setBooths(prev => prev.map(b => b.id === boothId ? { ...b, status } : b));
  }

  async function deleteBooth(boothId: string) {
    await fetch(`/api/admin/job-fair/${eventId}/booths/${boothId}`, { method: 'DELETE' });
    setBooths(prev => prev.filter(b => b.id !== boothId));
  }

  async function addListing() {
    if (!listingForm.booth_id || !listingForm.title) return;
    setSaving(true);
    const res = await fetch(`/api/admin/job-fair/${eventId}/listings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(listingForm),
    });
    if (res.ok) {
      const nl = await res.json();
      setBooths(prev => prev.map(b => b.id === listingForm.booth_id ? { ...b, job_fair_listings: [...b.job_fair_listings, nl] } : b));
      setListingForm(f => ({ ...f, title: '', description: '', salary_range: '', apply_url: '' }));
    }
    setSaving(false);
  }

  async function deleteListing(boothId: string, listingId: string) {
    await fetch(`/api/admin/job-fair/${eventId}/listings/${listingId}`, { method: 'DELETE' });
    setBooths(prev => prev.map(b => b.id === boothId ? { ...b, job_fair_listings: b.job_fair_listings.filter(l => l.id !== listingId) } : b));
  }

  const allMeetings = booths.flatMap(b => (b.job_fair_meetings ?? []).map(m => ({ ...m, booth: b })));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Job Fair Admin</h1>
      <p className="text-gray-400 mb-6">{eventTitle}</p>

      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
        {(['booths', 'listings', 'meetings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-t text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-sky-500/20 text-sky-400 border-b-2 border-sky-400' : 'text-gray-400 hover:text-gray-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'booths' && (
        <div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h2 className="font-semibold text-white mb-4">Add Employer</h2>
            <div className="grid grid-cols-2 gap-3">
              {[['company_name', 'Company Name *'], ['booth_number', 'Booth #'], ['website_url', 'Website URL'], ['logo_url', 'Logo URL'], ['contact_name', 'Contact Name'], ['contact_email', 'Contact Email']].map(([k, l]) => (
                <div key={k}>
                  <label className="block text-xs text-gray-400 mb-1">{l}</label>
                  <input value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Industries (comma-separated)</label>
                <input value={form.industries} onChange={e => setForm(f => ({ ...f, industries: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200" placeholder="tech, finance, healthcare" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none" rows={2} />
              </div>
            </div>
            <button onClick={addBooth} disabled={!form.company_name || saving}
              className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-bold text-sm rounded-lg transition-colors">
              Add Employer
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {booths.map(b => (
              <div key={b.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-white">{b.company_name}</p>
                  {b.booth_number && <p className="text-xs text-gray-500">Booth {b.booth_number}</p>}
                  <p className="text-xs text-gray-500 mt-1">{b.job_fair_listings.length} listings - {b.job_fair_meetings.length} meetings</p>
                </div>
                <select value={b.status} onChange={e => updateStatus(b.id, e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-2 py-1 text-gray-200">
                  {['pending', 'confirmed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => deleteBooth(b.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'listings' && (
        <div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h2 className="font-semibold text-white mb-4">Add Job Listing</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Employer *</label>
                <select value={listingForm.booth_id} onChange={e => setListingForm(f => ({ ...f, booth_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200">
                  <option value="">Select employer...</option>
                  {booths.map(b => <option key={b.id} value={b.id}>{b.company_name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Job Title *</label>
                <input value={listingForm.title} onChange={e => setListingForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200" />
              </div>
              {[['employment_type', 'Type', ['full_time', 'part_time', 'contract', 'internship', 'coop']], ['location_type', 'Location', ['remote', 'hybrid', 'in_person']]].map(([k, l, opts]) => (
                <div key={k as string}>
                  <label className="block text-xs text-gray-400 mb-1">{l as string}</label>
                  <select value={(listingForm as any)[k as string]} onChange={e => setListingForm(f => ({ ...f, [k as string]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200">
                    {(opts as string[]).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              {[['salary_range', 'Salary Range'], ['apply_url', 'Apply URL']].map(([k, l]) => (
                <div key={k}>
                  <label className="block text-xs text-gray-400 mb-1">{l}</label>
                  <input value={(listingForm as any)[k]} onChange={e => setListingForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200" />
                </div>
              ))}
            </div>
            <button onClick={addListing} disabled={!listingForm.booth_id || !listingForm.title || saving}
              className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-bold text-sm rounded-lg transition-colors">
              Add Listing
            </button>
          </div>

          {booths.map(b => b.job_fair_listings.length > 0 && (
            <div key={b.id} className="mb-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">{b.company_name}</h3>
              <div className="flex flex-col gap-2">
                {b.job_fair_listings.map(l => (
                  <div key={l.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
                    <p className="flex-1 text-sm text-white">{l.title}</p>
                    <span className="text-xs text-gray-500">{l.employment_type} - {l.location_type}</span>
                    <button onClick={() => deleteListing(b.id, l.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'meetings' && (
        <div className="flex flex-col gap-3">
          {allMeetings.length === 0 && <p className="text-gray-500">No meetings booked yet.</p>}
          {booths.map(b => {
            const bMeetings = b.job_fair_meetings ?? [];
            if (bMeetings.length === 0) return null;
            return (
              <div key={b.id} className="mb-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">{b.company_name} ({bMeetings.length} meetings)</h3>
                <div className="flex flex-col gap-2">
                  {bMeetings.sort((a, b) => a.time_slot.localeCompare(b.time_slot)).map(m => (
                    <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
                      <span className="text-sm text-gray-400 font-mono w-16">{m.time_slot}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'confirmed' ? 'bg-green-500/20 text-green-300' : m.status === 'cancelled' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{m.status}</span>
                      {m.notes && <p className="text-xs text-gray-500 flex-1 truncate">{m.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
