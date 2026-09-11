import Link from 'next/link';
import { LanguagePicker } from '@/components/language-picker';

const portals = [
  { href: '/patient/login', icon: '♥', title: 'Patient Portal', text: 'Appointments, records, family care and your medication history.' },
  { href: '/doctor/login', icon: '✚', title: 'Doctor Portal', text: 'Clinical queue, patient history, consultation and prescriptions.' },
  { href: '/kiosk', icon: '▣', title: 'Hospital Kiosk', text: 'Touch-friendly, private hospital check-in.' },
];

export default function Home() {
  return <main className="min-h-screen bg-[#f5f8fa]">
    <header className="sticky top-0 z-20 border-b-2 border-[#e77817] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 font-clinical text-lg font-extrabold text-calm sm:text-xl"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-calm text-white">✚</span><span className="truncate">AarogyaVaani</span></div>
        <LanguagePicker />
      </div>
    </header>
    <section className="mx-auto max-w-md px-4 pb-8 pt-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a3d62] via-[#075d72] to-[#147a4d] text-white"><div className="px-5 py-8"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-amber-100">Hospital digital health ecosystem</p><h1 className="mt-3 font-clinical text-3xl font-extrabold leading-tight">Trusted care, in every language.</h1><p className="mt-4 text-sm leading-6 text-cyan-50">AarogyaVaani connects patients, doctors and hospital staff through private digital health records and real hospital workflows.</p><Link href="/login" className="mt-6 inline-flex rounded-md bg-white px-4 py-3 text-sm font-bold text-[#0a3d62] shadow-sm">Choose portal access →</Link></div></div>
      <div className="mt-5 grid gap-3">{portals.map(portal=><Link key={portal.href} href={portal.href} className="clinical-card flex min-h-36 flex-col p-5 transition hover:border-cyan-300"><span className="grid h-11 w-11 place-items-center rounded-lg bg-cyan-50 text-xl text-calm">{portal.icon}</span><h2 className="mt-4 text-lg font-extrabold">{portal.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{portal.text}</p><span className="mt-auto pt-4 text-sm font-bold text-calm">Open portal →</span></Link>)}</div>
    </section>
  </main>;
}
