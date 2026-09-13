-- Patients need a minimal clinician directory to select a doctor when booking.
-- This deliberately exposes only the profile rows, never patient records.
drop policy if exists "authenticated users can view doctor directory" on public.doctors;
create policy "authenticated users can view doctor directory"
on public.doctors
for select
to authenticated
using (true);
