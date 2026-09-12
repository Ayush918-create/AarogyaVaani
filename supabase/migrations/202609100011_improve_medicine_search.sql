-- Search the imported Indian medicine catalogue by brand, salt/generic composition,
-- medicine form, and approximate spelling without returning clinical recommendations.
create extension if not exists pg_trgm;
-- PostgreSQL cannot change a function's OUT-column row type in place.
-- This only replaces the search RPC; it does not alter medicine data.
drop function if exists public.search_medicines(text);
create or replace function public.search_medicines(search_term text)
returns table(source_id bigint, name text, salt_composition text, manufacturer_name text, medicine_type text, pack_size_label text)
language sql stable security definer set search_path = public as $$
  with search as (select lower(trim(search_term)) as term)
  select m.source_id, m.name, m.salt_composition, m.manufacturer_name, m.medicine_type, m.pack_size_label
  from public.medicine_catalog m cross join search s
  where length(s.term) >= 2 and not m.is_discontinued
    and (lower(m.name) like '%' || s.term || '%'
      or lower(coalesce(m.salt_composition,'')) like '%' || s.term || '%'
      or lower(coalesce(m.medicine_type,'')) like '%' || s.term || '%'
      or similarity(lower(m.name),s.term) > 0.22)
  order by case when lower(m.name) like s.term || '%' then 0 when lower(coalesce(m.salt_composition,'')) like s.term || '%' then 1 else 2 end,
           greatest(similarity(lower(m.name),s.term), similarity(lower(coalesce(m.salt_composition,'')),s.term)) desc,
           m.name
  limit 8
$$;
grant execute on function public.search_medicines(text) to authenticated;
