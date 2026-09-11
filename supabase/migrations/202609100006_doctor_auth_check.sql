-- Reliable RLS-safe clinician authorization check after Supabase Auth login.
create or replace function public.is_current_doctor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.doctors where user_id = auth.uid())
$$;

grant execute on function public.is_current_doctor() to authenticated;
