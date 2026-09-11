-- Patient self-registration for the existing patient OTP flow.
-- The client calls this only after Supabase Auth has verified the OTP and supplied a session.
create or replace function public.ensure_current_patient()
returns public.patients
language plpgsql
security definer
set search_path = public
as $$
declare patient_row public.patients;
begin
  select * into patient_row from public.patients where user_id = auth.uid();
  if found then return patient_row; end if;
  insert into public.patients (user_id, full_name, phone)
  select id, coalesce(raw_user_meta_data->>'full_name', 'Patient'), phone
  from auth.users where id = auth.uid()
  returning * into patient_row;
  return patient_row;
end;
$$;
grant execute on function public.ensure_current_patient() to authenticated;
