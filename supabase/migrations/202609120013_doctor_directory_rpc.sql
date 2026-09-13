-- A deliberately limited clinician directory for appointment booking.
-- It exposes no clinician email, login identifier, or patient data.
create or replace function public.get_doctor_directory()
returns table (id uuid, full_name text, department text)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.full_name, d.department
  from public.doctors d
  order by d.full_name;
$$;

revoke all on function public.get_doctor_directory() from public;
grant execute on function public.get_doctor_directory() to authenticated;
