-- Stores OCR source text and Gemini extraction for a patient's own uploaded record.
-- API writes use the signed-in user's JWT; no privileged service key is required.
create table if not exists public.document_ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  source_type text not null check (source_type in ('medical_document', 'report')),
  source_id uuid not null,
  file_path text not null,
  ocr_text text not null,
  summary text,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_type, source_id)
);

alter table public.document_ai_analyses enable row level security;

create policy "patient reads own document analyses" on public.document_ai_analyses
for select to authenticated using (public.owns_patient(patient_id));
create policy "assigned doctor reads document analyses" on public.document_ai_analyses
for select to authenticated using (public.doctor_assigned(patient_id));
create policy "patient saves own document analyses" on public.document_ai_analyses
for insert to authenticated with check (auth.uid() = user_id and public.owns_patient(patient_id));
create policy "patient updates own document analyses" on public.document_ai_analyses
for update to authenticated using (auth.uid() = user_id and public.owns_patient(patient_id))
with check (auth.uid() = user_id and public.owns_patient(patient_id));

create index if not exists document_ai_analyses_patient_created_idx on public.document_ai_analyses(patient_id, created_at desc);
