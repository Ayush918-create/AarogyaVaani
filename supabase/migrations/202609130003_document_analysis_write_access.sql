-- The document-analysis API uses the signed-in patient's JWT. RLS policies
-- already restrict each row to that patient; PostgREST still needs these grants.
grant select, insert, update on public.document_ai_analyses to authenticated;
