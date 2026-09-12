'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Suggestion = { source_id: number; name: string; salt_composition: string | null; manufacturer_name: string | null; medicine_type: string | null; pack_size_label: string | null };
type Medication = { id: string; medicine_name: string; salt_composition: string | null; usage_note: string | null };

export function PatientMedicineHistory() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [chosen, setChosen] = useState<Suggestion | null>(null);
  const [note, setNote] = useState('');
  const [items, setItems] = useState<Medication[]>([]);
  const [message, setMessage] = useState('');

  async function patientId() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('patients').select('id').eq('user_id', user?.id ?? '').single();
    return data?.id;
  }
  async function load() {
    const id = await patientId();
    if (!id) return;
    const { data } = await supabase.from('patient_medication_history').select('id,medicine_name,salt_composition,usage_note').eq('patient_id', id).eq('is_current', true).order('reported_at', { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2 || chosen) { setSuggestions([]); return; }
      const { data } = await supabase.rpc('search_medicines', { search_term: query });
      setSuggestions(data ?? []);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, chosen]);
  async function add(e: FormEvent) {
    e.preventDefault();
    const medicineName = chosen?.name ?? query.trim();
    if (!medicineName) return;
    const id = await patientId();
    const { error } = await supabase.from('patient_medication_history').insert({
      patient_id: id, medicine_source_id: chosen?.source_id ?? null, medicine_name: medicineName,
      salt_composition: chosen?.salt_composition ?? null, usage_note: note || null,
    });
    if (error) { setMessage(error.message); return; }
    setQuery(''); setChosen(null); setNote(''); setSuggestions([]); setMessage('Added to your patient-reported medication list.'); load();
  }
  return <section className="clinical-card mt-6 p-5 md:p-6">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-100 text-xl text-cyan-800">💊</span><div><p className="clinical-eyebrow">Patient-reported information</p><h2 className="text-lg font-extrabold">Which medicines are you using now?</h2><p className="mt-1 text-sm text-slate-600">Start typing to find a medicine from the hospital catalogue. This records what you report—it is not a treatment recommendation.</p></div></div>
    <form onSubmit={add} className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
      <div className="relative"><label className="label">Medicine name</label><input className="input" value={query} onChange={e => { setQuery(e.target.value); setChosen(null); }} placeholder="e.g. Augmentin" autoComplete="off" />
        {suggestions.length > 0 && <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{suggestions.map(s => <button type="button" key={s.source_id} onClick={() => { setChosen(s); setQuery(s.name); setSuggestions([]); }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-cyan-50"><span className="block font-semibold text-slate-900">{s.name}</span><span className="block text-xs text-slate-500">{[s.salt_composition,s.medicine_type,s.pack_size_label,s.manufacturer_name].filter(Boolean).join(' · ') || 'Medicine catalogue'}</span></button>)}</div>}
      </div>
      <div><label className="label">How are you using it? <span className="font-normal">optional</span></label><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. morning" /></div>
      <button className="btn-primary self-end">Add medicine</button>
    </form>
    {message && <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p>}
    {items.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{items.map(item => <span key={item.id} className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-900">{item.medicine_name}{item.usage_note ? ` · ${item.usage_note}` : ''}</span>)}</div>}
  </section>;
}
