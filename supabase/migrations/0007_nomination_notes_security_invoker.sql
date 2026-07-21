-- nomination_notes was created without security_invoker, so Postgres treated it
-- as SECURITY DEFINER (owner privileges / RLS bypass). Recreate as INVOKER so
-- donations + users RLS of the querying role apply.
--
-- Note: users currently only allow SELECT of your own row, so from_name/avatar
-- for other donors resolve to the view's coalesce fallbacks until a public
-- profile projection exists.

create or replace view public.nomination_notes
with (security_invoker = on)
as
  select
    d.id as donation_id,
    d.nomination_id,
    d.created_at,
    d.anonymous,
    case
      when d.anonymous then 'anonymous bee'
      else coalesce(u.display_name, u.first_name, 'friend')
    end as from_name,
    case
      when d.anonymous then '🐝'
      else upper(substring(coalesce(u.first_name, 'A') for 1))
    end as avatar,
    d.note
  from donations d
  left join users u on u.id = d.donor_id
  where d.note is not null and d.note <> '' and d.status = 'succeeded';
