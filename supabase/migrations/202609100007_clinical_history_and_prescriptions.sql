-- Adds structured prescription instructions and clinician-authored diet advice.
-- Apply after 202609100006_doctor_auth_check.sql.
alter table public.consultations
  add column if not exists clinical_summary text,
  add column if not exists diet_advice text;

alter table public.prescriptions
  add column if not exists medicine_source_id bigint references public.medicine_catalog(source_id),
  add column if not exists meal_timing text,
  add column if not exists frequency_note text;

create index if not exists prescriptions_patient_created_at
  on public.prescriptions(patient_id, created_at desc);

create or replace function public.ensure_current_patient()
returns public.patients
language plpgsql security definer set search_path = public
as $$
declare patient_row public.patients;
begin
  select * into patient_row from public.patients where user_id = auth.uid();
  if found then return patient_row; end if;
  insert into public.patients (user_id, full_name, phone, email, abha_id)
  select id, coalesce(raw_user_meta_data->>'full_name', 'Patient'), nullif(raw_user_meta_data->>'phone', ''), email, nullif(raw_user_meta_data->>'abha_id', '')
  from auth.users where id = auth.uid()
  returning * into patient_row;
  return patient_row;
end;
$$;
grant execute on function public.ensure_current_patient() to authenticated;
