-- Emergency-only patient details and auditable kiosk token allocation.
alter table public.patients
  add column if not exists blood_group text,
  add column if not exists allergies text,
  add column if not exists chronic_conditions text,
  add column if not exists critical_medications text;

create table if not exists public.emergency_access_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  accessed_by uuid not null references auth.users(id),
  access_reason text,
  created_at timestamptz not null default now()
);
alter table public.emergency_access_logs enable row level security;
create policy "patient reads own emergency logs" on public.emergency_access_logs
for select to authenticated using (public.owns_patient(patient_id));

-- Only the patient or a doctor assigned through an appointment may request this limited view.
create or replace function public.emergency_patient_info(p_patient_id uuid, p_reason text default null)
returns table(patient_id uuid, full_name text, blood_group text, allergies text, chronic_conditions text, critical_medications text, emergency_contact text)
language plpgsql security definer set search_path = public as $$
begin
  if not (public.owns_patient(p_patient_id) or public.doctor_assigned(p_patient_id)) then
    raise exception 'Emergency information is not available for this user';
  end if;
  insert into public.emergency_access_logs(patient_id, accessed_by, access_reason)
  values (p_patient_id, auth.uid(), nullif(trim(p_reason), ''));
  return query select p.id, p.full_name, p.blood_group, p.allergies, p.chronic_conditions, p.critical_medications, p.emergency_contact
  from public.patients p where p.id = p_patient_id;
end;
$$;
grant execute on function public.emergency_patient_info(uuid,text) to authenticated;

-- Kiosk receives only an appointment code and returns a non-identifying token.
create or replace function public.kiosk_check_in(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare appointment_row public.appointments; assigned_token integer;
begin
  select * into appointment_row from public.appointments where check_in_code = upper(trim(p_code)) for update;
  if not found then return jsonb_build_object('ok', false, 'message', 'Appointment code not found.'); end if;
  if appointment_row.status in ('completed', 'cancelled') then return jsonb_build_object('ok', false, 'message', 'This appointment cannot be checked in.'); end if;
  assigned_token := coalesce(appointment_row.token_number, (select coalesce(max(token_number), 0) + 1 from public.appointments where doctor_id=appointment_row.doctor_id and appointment_date=appointment_row.appointment_date));
  update public.appointments set status='checked_in', token_number=assigned_token where id=appointment_row.id;
  insert into public.queue(appointment_id,patient_id,doctor_id,token_number,status,check_in_time)
  values(appointment_row.id,appointment_row.patient_id,appointment_row.doctor_id,assigned_token,'checked_in',now())
  on conflict(appointment_id) do update set token_number=excluded.token_number,status='checked_in',check_in_time=now();
  return jsonb_build_object('ok',true,'token',concat('A-',lpad(assigned_token::text,3,'0')),'message','Check-in successful. Please wait for your doctor.');
end;
$$;
grant execute on function public.kiosk_check_in(text) to anon, authenticated;
