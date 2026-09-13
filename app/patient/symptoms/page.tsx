'use client';

import { useEffect, useMemo, useState } from 'react';
import { PortalShell } from '@/components/portal-shell';
import { LANGUAGE_STORAGE_KEY, languages, selectedSpeechLanguage } from '@/lib/languages';
import { supabase } from '@/lib/supabase';
import { ensurePatientProfile } from '@/lib/patient-profile';

type Track = { name: string; questions: string[] };
type Suggestion = { source_id: number; name: string; salt_composition: string | null; manufacturer_name: string | null; medicine_type: string | null };

function trackFor(problem: string): Track {
  const text = problem.toLowerCase();
  const shared = [
    'When did this begin, and did it start suddenly or gradually?',
    'Where exactly do you feel it, and does it move anywhere else?',
    'How severe is it from 0 to 10, and what makes it better or worse?',
    'Is it getting better, worse, or staying the same?',
    'Has this happened before? If yes, how is this episode different?',
    'Have you noticed fever, vomiting, fainting, confusion, bleeding, weight loss, or trouble doing normal activities?',
    'Do you have any long-term illnesses, allergies, recent tests, operations, injuries, travel, or contact with someone unwell that your doctor should know about?',
  ];
  if (/chest|breath|breathing|heart|palpitation/.test(text)) return { name: 'chest or breathing concern', questions: ['When did it begin? Does it happen at rest, with activity, or after a trigger?', 'Where is the discomfort, and does it spread to the arm, jaw, back, or shoulder?', 'Do you have chest pressure, severe breathlessness, sweating, nausea, fainting, or a racing heartbeat?', ...shared.slice(2)] };
  if (/fever|cough|cold|throat|flu/.test(text)) return { name: 'fever or respiratory concern', questions: ['When did the fever, cough, or throat problem begin? What is the highest measured temperature?', 'Is the cough dry or with mucus? If mucus, what colour is it?', 'Do you have breathing difficulty, chest pain, dehydration, rash, confusion, or cough with blood?', ...shared.slice(3)] };
  if (/stomach|abdomen|abdominal|vomit|nausea|diarr|loose motion|constipat/.test(text)) return { name: 'stomach or bowel concern', questions: ['Where exactly is the discomfort and when did it begin?', 'Is it constant or does it come and go? Is it related to food or passing stool?', 'Do you have repeated vomiting, blood in vomit or stool, black stool, severe pain, fever, or inability to keep fluids down?', ...shared.slice(3)] };
  if (/head|migraine|dizz|vertigo|vision|weakness/.test(text)) return { name: 'headache or neurological concern', questions: ['When did the headache or dizziness start? Was it sudden, and is this different from earlier episodes?', 'Where is the pain, and how would you describe it: throbbing, pressure, spinning, or something else?', 'Do you have weakness, numbness, speech trouble, confusion, fainting, seizure, stiff neck, or vision loss?', ...shared.slice(3)] };
  if (/skin|rash|itch|allerg|swelling|hives/.test(text)) return { name: 'skin or allergy concern', questions: ['When did the rash, itching, or swelling begin? Where is it, and is it spreading?', 'How does the skin look and feel: red, painful, blistered, warm, dry, or itchy?', 'Do you have fever, painful skin, face or lip swelling, wheezing, or trouble breathing?', ...shared.slice(3)] };
  if (/urine|urinary|burn|kidney|pee/.test(text)) return { name: 'urinary concern', questions: ['When did the urinary symptoms begin?', 'Do you have burning, urgency, lower abdominal pain, back or flank pain, or change in urine colour?', 'Do you have fever, vomiting, blood in urine, pregnancy concerns, or inability to pass urine?', ...shared.slice(3)] };
  if (/joint|back|neck|muscle|injur|pain/.test(text)) return { name: 'pain or injury concern', questions: ['Where is the pain or injury, and when did it start?', 'Was there a fall, strain, accident, or repeated activity before it began?', 'Is there swelling, deformity, numbness, weakness, inability to move or bear weight, fever, or loss of bladder or bowel control?', ...shared.slice(3)] };
  return { name: 'general health concern', questions: ['When did this problem start, and is it improving, worsening, or staying the same?', 'Which symptoms are most troubling and where do you feel them?', 'How severe is it from 0 to 10, and what affects it?', 'Have you had this before, and what is different this time?', 'Does it interfere with sleep, food, work, walking, or other daily activities?', 'Have you noticed severe pain, breathing difficulty, fainting, confusion, heavy bleeding, or high fever?', 'What long-term conditions, allergies, recent tests, operations, injuries, travel, or sick contacts should your doctor know about?'] };
}

function summary(answers: string[], track: Track | null) {
  const joined = answers.join(' ').toLowerCase();
  const urgent = ['severe chest pain', 'cannot breathe', 'shortness of breath', 'faint', 'unconscious', 'weakness on one side', 'heavy bleeding', 'face swelling'].filter(term => joined.includes(term));
  return { chiefComplaint: answers[0] || 'Not recorded', track: track?.name || 'General health concern', urgent };
}

const initialQuestion = 'What is the main health problem or symptom you want help with?';
const medicineUseQuestion = 'Are you using any medicines, vitamins, inhalers, injections, or home remedies now? Type “none” if you are not using any.';
const medicineDetailsQuestion = 'What is the medicine name and how are you using it? Start typing to choose it from the hospital medicine list, or write “none”.';

function createQuestionPlan(problem: string) {
  // One first question + seven problem-specific questions + two medicine questions.
  // slice(0, 7) keeps every interview to exactly ten unique steps.
  return [initialQuestion, ...trackFor(problem).questions.slice(0, 7), medicineUseQuestion, medicineDetailsQuestion];
}

export default function Symptoms() {
  const [stage, setStage] = useState<'choose' | 'interview' | 'review'>('choose');
  const [language, setLanguage] = useState('en-IN');
  const [mode, setMode] = useState<'voice' | 'typing'>('typing');
  const [answers, setAnswers] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionPlan, setQuestionPlan] = useState<string[]>([]);
  const [displayQuestion, setDisplayQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState('');
  const [notice, setNotice] = useState('');
  const [listening, setListening] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [medicineName, setMedicineName] = useState('');

  const track = useMemo(() => answers[0] ? trackFor(answers[0]) : null, [answers]);
  const current = questionIndex;
  // Keep the visible sequence as one explicit plan.  Building it at the same
  // time as the first answer prevents React state timing from ever rendering
  // Question 1 again at later interview steps.
  const questions = questionPlan.length ? questionPlan : [initialQuestion];

  useEffect(() => setLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en-IN'), []);
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (current !== 9 || medicineName.trim().length < 2) { setSuggestions([]); return; }
      const { data } = await supabase.rpc('search_medicines', { search_term: medicineName });
      setSuggestions((data || []) as Suggestion[]);
    }, 250);
    return () => clearTimeout(timer);
  }, [current, medicineName]);

  function start() { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); window.dispatchEvent(new Event('aarogyavaani-language')); setAnswers([]); setQuestionIndex(0); setQuestionPlan([initialQuestion]); setDisplayQuestion(initialQuestion); setAnswer(''); setMedicineName(''); setNotice(''); setStage('interview'); }
  function speak() {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setNotice('Voice typing is not supported in this browser. Please type your answer.'); return; }
    const recognition = new Recognition(); recognition.lang = selectedSpeechLanguage();
    recognition.onresult = (event: any) => { setAnswer(event.results[0][0].transcript); setListening(false); };
    recognition.onerror = () => { setListening(false); setNotice('We could not understand the recording. Please type your answer.'); };
    recognition.onend = () => setListening(false); setListening(true); recognition.start();
  }
  function next() {
    const value = current === 9 ? medicineName.trim() : answer.trim();
    if (!value) { setNotice('Please add an answer before continuing.'); return; }
    const result = [...answers, value];
    const plan = current === 0 ? createQuestionPlan(value) : questions;
    if (current === 0) setQuestionPlan(plan);
    setAnswers(result); setAnswer(''); setMedicineName(''); setSuggestions([]); setNotice('');
    if (current >= 9) setStage('review'); else { setQuestionIndex(current + 1); setDisplayQuestion(plan[current + 1]); }
  }
  async function save() {
    const profile = await ensurePatientProfile();
    if (profile.error || !profile.patient) { setNotice('Your profile could not be created. Please sign out and sign in again.'); return; }
    const combined = answers.map((item, index) => `${questions[index] || 'Additional information'}\n${item}`).join('\n\n');
    const { error } = await supabase.from('symptom_entries').insert({ patient_id: profile.patient.id, symptom_text: combined, input_method: mode === 'voice' ? 'voice' : 'typed', language: selectedSpeechLanguage() });
    setNotice(error?.message || 'Your 10-question patient history was saved for your care team.');
    if (!error) { setAnswers([]); setQuestionPlan([]); setStage('choose'); }
  }

  if (stage === 'choose') return <PortalShell role="patient" title="Health interview"><section className="clinical-card p-5"><p className="clinical-eyebrow">Patient-led clinical intake</p><h2 className="mt-1 text-2xl font-extrabold">Tell your doctor what is going on.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your first answer selects a focused 10-question interview. It organizes your history for review; it does not diagnose you.</p><p className="label mt-6">Language</p><div className="grid grid-cols-2 gap-3">{languages.map(item => <button key={item.code} type="button" onClick={() => setLanguage(item.code)} className={`rounded-xl border p-3 text-left ${language === item.code ? 'border-calm bg-cyan-50' : 'border-slate-200'}`}><b>{item.label}</b></button>)}</div><p className="label mt-6">Answer method</p><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setMode('voice')} className={`rounded-xl border p-3 text-left ${mode === 'voice' ? 'border-calm bg-cyan-50' : 'border-slate-200'}`}>Voice + touch</button><button type="button" onClick={() => setMode('typing')} className={`rounded-xl border p-3 text-left ${mode === 'typing' ? 'border-calm bg-cyan-50' : 'border-slate-200'}`}>Touch + typing</button></div><button onClick={start} className="btn-primary mt-5 w-full">Start 10-question health interview</button>{notice && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}</section></PortalShell>;

  if (stage === 'review') { const report = summary(answers, track); return <PortalShell role="patient" title="Review health history"><section className="clinical-card p-5"><h2 className="text-xl font-extrabold">Review before sharing</h2><p className="mt-2 text-sm text-slate-600">Your doctor will see this patient-reported history. It is not a medical diagnosis.</p>{report.urgent.length > 0 && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><b>Urgent attention flag</b><p className="mt-1">Potential warning signs reported: {report.urgent.join(', ')}. Seek urgent in-person care if symptoms are severe or worsening.</p></div>}<div className="mt-4 rounded-xl bg-cyan-50 p-4 text-sm text-slate-700"><p className="clinical-eyebrow">Structured patient-reported summary</p><p className="mt-2"><b>Main concern:</b> {report.chiefComplaint}</p><p className="mt-1"><b>Concern track:</b> {report.track}</p><p className="mt-1"><b>Questions answered:</b> {answers.length} of 10</p></div><div className="mt-4 space-y-3">{answers.map((item, index) => <div key={index} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{questions[index]}</b><p className="mt-1">{item}</p></div>)}</div><button onClick={save} className="btn-primary mt-5 w-full">Save for my care team</button><button onClick={() => setStage('interview')} className="mt-3 w-full text-sm font-bold text-calm">Back and edit</button>{notice && <p className="mt-3 text-sm text-red-700">{notice}</p>}</section></PortalShell>; }

  const medicineStep = current === 9;
  return <PortalShell role="patient" title="Health interview"><section className="clinical-card p-5"><p className="clinical-eyebrow">Question {current + 1} of 10{track && current > 0 ? ` · ${track.name}` : ''}</p><h2 className="mt-2 text-xl font-extrabold">{displayQuestion}</h2>{medicineStep ? <div className="relative mt-5"><label className="label">Medicine name or “none”</label><input className="input" value={medicineName} onChange={event => setMedicineName(event.target.value)} placeholder="Start typing a medicine name" autoComplete="off" />{suggestions.length > 0 && <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{suggestions.map(item => <button type="button" key={item.source_id} onClick={() => { setMedicineName(item.name); setSuggestions([]); }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-cyan-50"><span className="block font-semibold">{item.name}</span><span className="block text-xs text-slate-500">{[item.salt_composition, item.medicine_type, item.manufacturer_name].filter(Boolean).join(' · ')}</span></button>)}</div>}</div> : <textarea className="input mt-5 min-h-36" value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Answer in your own words" />}{mode === 'voice' && !medicineStep && <button type="button" onClick={speak} className="btn-secondary mt-3 w-full">{listening ? 'Listening…' : '🎤 Speak your answer'}</button>}<button onClick={next} className="btn-primary mt-3 w-full">{current === 9 ? 'Review history' : 'Continue'}</button>{notice && <p className="mt-3 text-sm text-red-700">{notice}</p>}</section></PortalShell>;
}
