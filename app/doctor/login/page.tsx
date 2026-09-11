'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DoctorLogin() {
  const [identity, setIdentity] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      let email = identity.trim();
      if (!email.includes('@')) {
        const lookup = await supabase.rpc('doctor_login_email', { p_doctor_id: email.toUpperCase() });
        if (lookup.error) throw new Error('Doctor service is unavailable. Apply the initial hospital migration in Supabase.');
        if (!lookup.data) throw new Error('Doctor ID was not found. Use your registered doctor email instead.');
        email = lookup.data;
      }
      const auth = await supabase.auth.signInWithPassword({ email, password });
      if (auth.error) throw new Error('Doctor ID/email or password is incorrect.');
      const authorization = await supabase.rpc('is_current_doctor');
      if (authorization.error) throw new Error('Doctor authorization function is missing. Run the latest doctor authorization SQL in Supabase.');
      if (!authorization.data) { await supabase.auth.signOut(); throw new Error('This account is not linked to a doctor profile.'); }
      router.replace('/doctor/dashboard');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Doctor sign-in failed.'); } finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-[#edf6f6] p-5"><form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-soft"><Link href="/login" className="font-bold text-calm">← AarogyaVaani access</Link><div className="mt-7 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-cyan-50 text-2xl text-calm">⚕</span><p className="mt-4 clinical-eyebrow">CLINICAL TEAM ACCESS</p><h1 className="mt-1 text-2xl font-extrabold">Doctor sign in</h1><p className="mt-2 text-sm text-slate-500">Use your hospital Doctor ID or your registered doctor email.</p></div><label className="label mt-7">Doctor ID or email</label><input className="input" value={identity} onChange={event => setIdentity(event.target.value)} placeholder="DOC001 or doctor@email.com" autoComplete="username" required/><label className="label mt-5">Password</label><input className="input" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required/><button className="btn-primary mt-6 w-full" disabled={busy}>{busy ? 'Signing in…' : 'Secure doctor sign in →'}</button>{error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}</form></main>;
}
