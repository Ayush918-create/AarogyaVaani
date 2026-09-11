-- Patient-reported medication history and a minimal, safe catalogue search endpoint.
-- Run after the initial hospital schema and medicine_catalog migrations.
create table if not exists public.patient_medication_history (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  medicine_source_id bigint references public.medicine_catalog(source_id),
  medicine_name text not null,
  salt_composition text,
  usage_note text,
  is_current boolean not null default true,
  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists patient_medicine_history_patient on public.patient_medication_history(patient_id, is_current);
alter table public.patient_medication_history enable row level security;

create policy "patient manages their medication history"
on public.patient_medication_history for all to authenticated
using (public.owns_patient(patient_id))
with check (public.owns_patient(patient_id));

create policy "assigned doctor reads reported medicines"
on public.patient_medication_history for select to authenticated
using (public.doctor_assigned(patient_id));

-- Returns only identity information needed for autocomplete; it never returns
-- dosage recommendations, clinical advice, interactions, or patient data.
create or replace function public.search_medicines(search_term text)
returns table(source_id bigint, name text, salt_composition text, manufacturer_name text)
language sql stable security definer set search_path = public
as $$
  select source_id, name, salt_composition, manufacturer_name
  from public.medicine_catalog
  where length(trim(search_term)) >= 2
    and name ilike ('%' || trim(search_term) || '%')
    and not is_discontinued
  order by name
  limit 8
$$;
grant execute on function public.search_medicines(text) to authenticated;
