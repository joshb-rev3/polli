-- Sync auth.users → public.users (+ wallet) so Stripe donation / cashout paths have a row.
-- Idempotent: safe to re-run.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, first_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(
      new.raw_user_meta_data->>'first_name',
      split_part(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), ' ', 1)
    )
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.users.email),
    display_name = coalesce(public.users.display_name, excluded.display_name),
    first_name = coalesce(public.users.first_name, excluded.first_name),
    updated_at = now();

  perform public.ensure_wallet(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any auth users missing a public.users row
insert into public.users (id, email, display_name)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(coalesce(u.email, ''), '@', 1))
from auth.users u
on conflict (id) do nothing;

-- Wallets for existing users (ensure_wallet is service_role-only via grants,
-- but this migration runs as postgres / owner so it can call it)
do $$
declare r record;
begin
  for r in select id from public.users loop
    perform public.ensure_wallet(r.id);
  end loop;
end $$;

grant execute on function public.handle_new_user() to supabase_auth_admin;
