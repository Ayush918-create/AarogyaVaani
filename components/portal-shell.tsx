'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LanguagePicker } from '@/components/language-picker';

const patientNav = [['⌂','Home','/patient/dashboard'],['▣','Records','/patient/summary'],['＋','Interview','/patient/symptoms'],['◌','Profile','/patient/family']];
const doctorNav = [['⌂','Queue','/doctor/dashboard'],['▣','Patients','/doctor/dashboard']];

export function PortalShell({ role, title, children }: { role:'patient'|'doctor'; title:string; children:React.ReactNode }) {
  const path = usePathname(); const router = useRouter(); const nav = role === 'patient' ? patientNav : doctorNav;
  async function logout(){ await supabase.auth.signOut(); router.push('/'); }
  return <div className="min-h-screen bg-[#f7fbfb] pb-20 text-ink">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-calm">AarogyaVaani · {role} portal</p><h1 className="truncate text-lg font-black">{title}</h1></div>
        <div className="flex shrink-0 items-center gap-2">{role==='patient'&&<LanguagePicker/>}<button onClick={logout} className="grid h-9 w-9 place-items-center rounded-full bg-cyan-50 text-xs font-bold text-calm" aria-label="Sign out">↗</button></div>
      </div>
    </header>
    <main className="mx-auto max-w-md p-4">{children}</main>
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-2 py-2">
      <div className="mx-auto flex max-w-md justify-around">{nav.map(([icon,name,href])=><Link className={`min-w-16 rounded-xl px-2 py-1 text-center text-[10px] font-bold ${path===href?'bg-cyan-50 text-calm':'text-slate-500'}`} key={name} href={href}><span className="block text-base leading-5">{icon}</span>{name}</Link>)}</div>
    </nav>
  </div>;
}

export function Status({children, tone='teal'}:{children:React.ReactNode;tone?:'teal'|'amber'|'blue'|'green'|'red'}) { const colors={teal:'bg-teal-100 text-teal-800',amber:'bg-amber-100 text-amber-800',blue:'bg-blue-100 text-blue-800',green:'bg-green-100 text-green-800',red:'bg-red-100 text-red-800'}; return <span className={`badge ${colors[tone]}`}>{children}</span> }
