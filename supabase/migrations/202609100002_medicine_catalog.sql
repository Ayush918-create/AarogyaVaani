-- Full Indian medicine catalogue import target.
-- Import `updated_indian_medicine_data.csv` into this table after running this migration.
create table public.medicine_catalog (
  source_id bigint primary key,
  name text not null,
  price numeric(12,2),
  is_discontinued boolean not null default false,
  manufacturer_name text,
  medicine_type text,
  pack_size_label text,
  short_composition1 text,
  short_composition2 text,
  salt_composition text,
  medicine_description text,
  side_effects text,
  drug_interactions jsonb,
  imported_at timestamptz not null default now()
);

create index medicine_catalog_name_search on public.medicine_catalog using gin (to_tsvector('simple', name));
create index medicine_catalog_active_name on public.medicine_catalog (name) where not is_discontinued;
alter table public.medicine_catalog enable row level security;

-- Catalogue data is readable by authenticated clinicians only; patients never receive
-- dosage recommendations from this dataset.
create policy "doctors can read medicine catalogue"
on public.medicine_catalog for select to authenticated
using (public.is_doctor());
