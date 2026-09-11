-- Patient self-registration, patient appointment booking, and kiosk check-in.
-- Apply with `npx supabase db push` (or run this file in the Supabase SQL Editor).
create or replace function public.abha_login_email(p_abha_id text)
returns text language sql security definer set search_path = public as $$
  select email from public.patients where abha_id = trim(p_abha_id) limit 1
$$;
grant execute on function public.abha_login_email(text) to anon, authenticated;

create policy "patient creates own appointments" on public.appointments
for insert to authenticated with check (public.owns_patient(patient_id));

alter table public.appointments add column if not exists check_in_code text;
update public.appointments
set check_in_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where check_in_code is null;
alter table public.appointments alter column check_in_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
alter table public.appointments alter column check_in_code set not null;
create unique index if not exists appointments_check_in_code_key on public.appointments(check_in_code);

create or replace function public.kiosk_check_in(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare appointment_row public.appointments;
begin
  select * into appointment_row from public.appointments where check_in_code = upper(trim(p_code));
  if not found then return jsonb_build_object('ok', false, 'message', 'Appointment code not found.'); end if;
  if appointment_row.status in ('completed', 'cancelled') then return jsonb_build_object('ok', false, 'message', 'This appointment cannot be checked in.'); end if;
  update public.appointments set status = 'checked_in' where id = appointment_row.id;
  insert into public.queue (appointment_id, patient_id, doctor_id, token_number, status, check_in_time)
  values (appointment_row.id, appointment_row.patient_id, appointment_row.doctor_id, coalesce(appointment_row.token_number, 0), 'checked_in', now())
  on conflict (appointment_id) do update set status = 'checked_in', check_in_time = now();
  return jsonb_build_object('ok', true, 'message', 'You are checked in. Please wait for your token to be called.');
end;
$$;
grant execute on function public.kiosk_check_in(text) to anon, authenticated;
