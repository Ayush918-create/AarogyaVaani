-- Allow the authenticated doctor role to use existing RLS-protected consultation features.
-- RLS policies still restrict every row to that doctor's own appointments/patients.
grant select on public.doctors to authenticated;
grant select, update on public.appointments to authenticated;
grant select, insert, update on public.consultations to authenticated;
grant select, insert, update on public.prescriptions to authenticated;
grant select on public.queue to authenticated;

-- These columns are used by the doctor prescription and patient routine screens.
alter table public.consultations
  add column if not exists clinical_summary text,
  add column if not exists diet_advice text;
alter table public.prescriptions
  add column if not exists medicine_source_id bigint references public.medicine_catalog(source_id),
  add column if not exists meal_timing text,
  add column if not exists frequency_note text;

notify pgrst, 'reload schema';
