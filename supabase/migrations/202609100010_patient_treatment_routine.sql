-- Patient medication status records. Prescriptions remain the clinician source of truth.
create table if not exists public.medication_adherence_logs (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  scheduled_date date not null default current_date,
  time_of_day text not null check (time_of_day in ('Morning','Afternoon','Evening','Night')),
  status text not null check (status in ('taken','skipped')),
  recorded_at timestamptz not null default now(),
  unique(prescription_id, scheduled_date, time_of_day)
);
create index if not exists medication_adherence_patient_date on public.medication_adherence_logs(patient_id, scheduled_date desc);
alter table public.medication_adherence_logs enable row level security;
create policy "patient manages own medication status" on public.medication_adherence_logs
for all to authenticated using (public.owns_patient(patient_id)) with check (public.owns_patient(patient_id));
create policy "assigned doctor reads medication status" on public.medication_adherence_logs
for select to authenticated using (public.doctor_assigned(patient_id));
