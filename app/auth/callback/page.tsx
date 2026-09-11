'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const [message, setMessage] = useState('Finishing your secure sign-in…'); const router = useRouter();
  useEffect(() => { const timer = window.setTimeout(() => setMessage('This is taking longer than expected. Please keep this tab open.'), 8000); const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => { if (event !== 'SIGNED_IN' || !session?.user) return; const { error } = await supabase.rpc('ensure_current_patient'); if (error) { setMessage('Your sign-in succeeded, but the patient-profile migration is missing. Please contact the administrator.'); return; } router.replace('/patient/dashboard'); }); supabase.auth.getSession().then(async ({ data: { session } }) => { if (!session?.user) return; const { error } = await supabase.rpc('ensure_current_patient'); if (error) { setMessage('Your sign-in succeeded, but the patient-profile migration is missing.'); return; } router.replace('/patient/dashboard'); }); return () => { window.clearTimeout(timer); listener.subscription.unsubscribe(); }; }, [router]);
  return <main className="grid min-h-screen place-items-center bg-[#f7fbfb] p-5"><section className="w-full max-w-sm rounded-[28px] bg-white p-7 text-center shadow-soft"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-xl text-calm">✚</span><h1 className="mt-5 text-xl font-extrabold">AarogyaVaani</h1><p className="mt-3 text-sm leading-6 text-slate-600">{message}</p></section></main>;
}
