'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalShell, Status } from '@/components/portal-shell';
import { supabase } from '@/lib/supabase';

type Row = { id:string; token_number:number|null; status:string; appointment_time:string|null; reason:string|null; patients:{full_name:string;patient_id:string}|null };

export default function DoctorDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState('Doctor');
  const [notice, setNotice] = useState('');
  const router = useRouter();

  async function load() {
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/doctor/login'); return; }
    const doctor = await supabase.from('doctors').select('id,full_name').eq('user_id', user.id).single();
    if (doctor.error || !doctor.data) { setNotice('Your doctor profile could not be loaded. Please use the linked doctor account.'); return; }
    setName(doctor.data.full_name || 'Doctor');
    const appointments = await supabase.from('appointments')
      .select('id,token_number,status,appointment_time,reason,patients(full_name,patient_id)')
      .eq('doctor_id', doctor.data.id)
      .in('status', ['scheduled','waiting','checked_in','in_consultation'])
      .order('appointment_time');
    if (appointments.error) setNotice(appointments.error.message);
    setRows((appointments.data || []) as unknown as Row[]);
  }

  useEffect(() => { load(); }, []);
  const scheduled = rows.filter(row => ['scheduled','waiting','checked_in'].includes(row.status)).length;

  return <PortalShell role="doctor" title="Today’s care queue">
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-ink to-slate-700 p-7 text-white"><p className="text-teal-200">Good day,</p><h2 className="text-3xl font-black">Dr. {name}</h2><p className="mt-3 text-slate-200">Booked, checked-in, and active patients assigned to you are visible here.</p></div>
    {notice && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
    <div className="grid gap-4 md:grid-cols-3"><Metric label="Scheduled / waiting" value={scheduled}/><Metric label="In consultation" value={rows.filter(row => row.status === 'in_consultation').length}/><Metric label="Completed today" value="—"/></div>
    <div className="card mt-6 overflow-hidden"><div className="border-b p-5"><h2 className="font-black">Assigned patients</h2></div>{rows.length === 0 ? <p className="p-8 text-slate-500">No booked or active patients are assigned to you.</p> : <div className="divide-y">{rows.map(row => <div className="flex flex-wrap items-center gap-4 p-5" key={row.id}><strong className="grid h-10 w-10 place-items-center rounded-lg bg-teal-50 text-calm">{row.token_number || '—'}</strong><div className="min-w-40 flex-1"><p className="font-bold">{row.patients?.full_name || 'Private patient'}</p><p className="text-sm text-slate-500">{row.appointment_time?.slice(0,5) || 'Time pending'} · {row.reason || 'Consultation'}</p></div><Status tone={row.status === 'in_consultation' ? 'blue' : 'amber'}>{row.status.replace('_',' ')}</Status><Link className="btn-primary" href={`/doctor/patient/${row.id}`}>Open record</Link></div>)}</div>}</div>
  </PortalShell>;
}

function Metric({label,value}:{label:string;value:string|number}) { return <div className="card p-5"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>; }
