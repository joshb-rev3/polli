-- Fix rls_disabled_in_public: categories was created without RLS.
-- Lookup/seed data — public read, no client writes (mutations via service role / migrations).

alter table categories enable row level security;

create policy "categories public read" on categories
  for select
  using (true);
