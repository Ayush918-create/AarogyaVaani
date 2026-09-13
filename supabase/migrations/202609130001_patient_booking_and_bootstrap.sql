-- Patient booking/profile repair for Supabase projects that predate the kiosk migration.
alter table public.appointments add column if not exists check_in_code text;
update public.appointments set check_in_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) where check_in_code is null;
alter table public.appointments alter column check_in_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
create unique index if not exists appointments_check_in_code_key on public.appointments(check_in_code);

create or replace function public.ensure_current_patient()
returns public.patients language sql security definer set search_path = public, auth
as 'insert into public.patients (user_id, full_name, phone, email, abha_id)
    select id, coalesce(nullif(raw_user_meta_data->>''full_name'', ''''), nullif(raw_user_meta_data->>''name'', ''''), email, ''Patient''), nullif(raw_user_meta_data->>''phone'', ''''), email, nullif(raw_user_meta_data->>''abha_id'', '''')
    from auth.users where id = auth.uid()
    on conflict (user_id) do update set full_name = public.patients.full_name
    returning public.patients.*';
revoke all on function public.ensure_current_patient() from public;
grant execute on function public.ensure_current_patient() to authenticated;

create or replace function public.request_patient_appointment(p_doctor_id uuid, p_appointment_date date, p_appointment_time time, p_reason text)
returns public.appointments language sql security definer set search_path = public, auth
as 'insert into public.appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, status)
    select p.id, p_doctor_id, p_appointment_date, p_appointment_time, trim(p_reason), ''scheduled''
    from public.ensure_current_patient() p join public.doctors d on d.id = p_doctor_id
    where auth.uid() is not null and p_appointment_date >= current_date and nullif(trim(coalesce(p_reason, '''')), '''') is not null
    returning public.appointments.*';
revoke all on function public.request_patient_appointment(uuid, date, time, text) from public;
grant execute on function public.request_patient_appointment(uuid, date, time, text) to authenticated;

create or replace function public.get_current_patient_appointments()
returns table (id uuid, appointment_date date, appointment_time time, reason text, status public.appointment_status, token_number integer, check_in_code text, doctor_name text, department text)
language sql security definer set search_path = public, auth
as 'select a.id, a.appointment_date, a.appointment_time, a.reason, a.status, a.token_number, a.check_in_code, d.full_name, d.department
    from public.ensure_current_patient() p join public.appointments a on a.patient_id = p.id join public.doctors d on d.id = a.doctor_id
    order by a.appointment_date desc, a.appointment_time desc nulls last';
revoke all on function public.get_current_patient_appointments() from public;
grant execute on function public.get_current_patient_appointments() to authenticated;

-- RLS remains the access boundary; these are the API privileges required by this project.
grant usage on schema public to authenticated;
grant select, insert, update on public.patients to authenticated;
grant select on public.appointments to authenticated;
grant select, insert on public.symptom_entries to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.patient_medication_history to authenticated;
grant select, insert, update, delete on public.medical_documents to authenticated;
grant select, insert, update, delete on public.reports to authenticated;
grant select on public.document_ai_analyses to authenticated;
drop policy if exists "authenticated users can view doctor directory" on public.doctors;
