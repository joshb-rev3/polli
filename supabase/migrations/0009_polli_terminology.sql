-- Polli terminology cutover (pre-launch; test data may be wiped).
-- nominations → pollis, nominator → starter, nominee → recipient.

-- ─── Drop dependent objects that hard-code old names ─────────────────────────

drop view if exists public.nomination_notes;

drop policy if exists "nominations public read" on nominations;
drop policy if exists "nominations nominator insert" on nominations;
drop policy if exists "nominations nominator update" on nominations;
drop policy if exists "donations public per nomination" on donations;

drop trigger if exists nominations_slug_trigger on nominations;
drop trigger if exists nominations_closes_at on nominations;
drop trigger if exists nominations_touch on nominations;

drop function if exists generate_nomination_slug();
drop function if exists set_nomination_closes_at();

-- ─── Rename type / table / columns ───────────────────────────────────────────

alter type nomination_status rename to polli_status;

alter table nominations rename to pollis;

alter table pollis rename column nominator_id to starter_id;
alter table pollis rename column nominee_id to recipient_id;
alter table pollis rename column nominee_first to recipient_first;
alter table pollis rename column nominee_last to recipient_last;
alter table pollis rename column nominee_email to recipient_email;
alter table pollis rename column nominee_phone to recipient_phone;

alter table donations rename column nomination_id to polli_id;
alter table donations rename column net_to_nominee_cents to net_to_recipient_cents;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

alter index if exists nominations_slug_idx rename to pollis_slug_idx;
alter index if exists nominations_status_idx rename to pollis_status_idx;
alter index if exists nominations_nominator_idx rename to pollis_starter_idx;
alter index if exists nominations_nominee_idx rename to pollis_recipient_idx;
alter index if exists donations_nomination_idx rename to donations_polli_idx;
alter index if exists one_donation_per_donor_per_nomination
  rename to one_donation_per_donor_per_polli;

-- ─── Slug + closes_at triggers ───────────────────────────────────────────────

create or replace function generate_polli_slug() returns trigger
language plpgsql as $$
declare
  base text;
  candidate text;
  i int := 0;
begin
  if new.slug is not null and length(trim(new.slug)) > 0 then
    return new;
  end if;
  base := slugify(new.recipient_first || '-' || new.recipient_last);
  candidate := base;
  while exists (select 1 from pollis where slug = candidate and id <> new.id) loop
    i := i + 1;
    candidate := base || '-' || i::text;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;

create trigger pollis_slug_trigger
  before insert on pollis
  for each row execute function generate_polli_slug();

create or replace function set_polli_closes_at() returns trigger
language plpgsql as $$
begin
  if new.closes_at is null then
    new.closes_at := now() + make_interval(days => coalesce(new.timeline_days, 7));
  end if;
  return new;
end;
$$;

create trigger pollis_closes_at
  before insert on pollis
  for each row execute function set_polli_closes_at();

create trigger pollis_touch
  before update on pollis
  for each row execute function touch_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

create policy "pollis public read" on pollis for select using (
  status in ('live', 'closed', 'paid_out')
  or starter_id = auth.uid()
  or recipient_id = auth.uid()
);

create policy "pollis starter insert" on pollis for insert
  with check (starter_id = auth.uid());

create policy "pollis starter update" on pollis for update
  using (starter_id = auth.uid() or recipient_id = auth.uid());

create policy "donations public per polli" on donations for select using (
  exists (
    select 1 from pollis p
    where p.id = donations.polli_id
      and p.status in ('live', 'closed', 'paid_out')
  )
);

-- ─── Notes view ──────────────────────────────────────────────────────────────

create or replace view public.polli_notes
with (security_invoker = on)
as
  select
    d.id as donation_id,
    d.polli_id,
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

-- ─── complete_donation (updated names) ───────────────────────────────────────

create or replace function complete_donation(
  p_donation_id uuid,
  p_annual_cap_cents bigint default 60000
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d donations;
  p pollis;
  w wallets;
  v_year integer := extract(year from now())::integer;
  v_annual recipient_annual_totals;
  v_credit bigint;
  v_ledger_key text;
  v_balance_after bigint;
begin
  select * into d from donations where id = p_donation_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'donation_not_found');
  end if;

  if d.status = 'succeeded' then
    return jsonb_build_object('ok', true, 'idempotent', true, 'donation_id', d.id);
  end if;

  if d.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'invalid_status', 'status', d.status);
  end if;

  select * into p from pollis where id = d.polli_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'polli_not_found');
  end if;

  if p.status not in ('live', 'closed') then
    return jsonb_build_object('ok', false, 'error', 'polli_not_accepting');
  end if;

  v_credit := d.net_to_recipient_cents;
  if v_credit is null or v_credit <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_credit');
  end if;

  -- Denormalize recipient from polli when present
  if d.recipient_id is null and p.recipient_id is not null then
    d.recipient_id := p.recipient_id;
  end if;

  v_ledger_key := 'donation_received:' || d.id::text;
  if exists (select 1 from ledger_entries where idempotency_key = v_ledger_key) then
    update donations
    set status = 'succeeded',
        recipient_id = coalesce(recipient_id, d.recipient_id),
        completed_at = coalesce(completed_at, now())
    where id = d.id and status <> 'succeeded';
    return jsonb_build_object('ok', true, 'idempotent', true, 'donation_id', d.id);
  end if;

  if d.recipient_id is not null then
    insert into recipient_annual_totals (recipient_id, calendar_year)
    values (d.recipient_id, v_year)
    on conflict (recipient_id, calendar_year) do nothing;

    select * into v_annual
    from recipient_annual_totals
    where recipient_id = d.recipient_id and calendar_year = v_year
    for update;

    if v_annual.total_received_cents + v_credit > p_annual_cap_cents then
      return jsonb_build_object(
        'ok', false,
        'error', 'annual_cap_exceeded',
        'cap_cents', p_annual_cap_cents,
        'ytd_cents', v_annual.total_received_cents,
        'credit_cents', v_credit
      );
    end if;
  end if;

  update donations
  set status = 'succeeded',
      recipient_id = d.recipient_id,
      completed_at = now()
  where id = d.id;

  update pollis
  set backer_count = backer_count + 1,
      raised_cents = raised_cents + v_credit,
      updated_at = now()
  where id = p.id;

  if d.donor_id is not null then
    update users
    set last_given_at = now(),
        last_activity_at = now()
    where id = d.donor_id;
  end if;

  if d.recipient_id is null then
    return jsonb_build_object(
      'ok', true,
      'donation_id', d.id,
      'wallet_credited', false,
      'reason', 'recipient_unlinked'
    );
  end if;

  w := ensure_wallet(d.recipient_id);
  v_balance_after := w.balance_cents + v_credit;

  insert into ledger_entries (
    user_id, entry_type, amount_cents, balance_after_cents,
    reference_table, reference_id, idempotency_key, notes
  ) values (
    d.recipient_id, 'donation_received', v_credit, v_balance_after,
    'donations', d.id, v_ledger_key, null
  );

  update wallets
  set balance_cents = v_balance_after,
      lifetime_received_cents = lifetime_received_cents + v_credit,
      dormant_since = null,
      updated_at = now()
  where user_id = d.recipient_id;

  update recipient_annual_totals
  set total_received_cents = total_received_cents + v_credit,
      donation_count = donation_count + 1,
      updated_at = now()
  where recipient_id = d.recipient_id and calendar_year = v_year;

  update users
  set ytd_received_cents = case
        when ytd_year = v_year then coalesce(ytd_received_cents, 0) + v_credit
        else v_credit
      end,
      ytd_year = v_year,
      last_activity_at = now()
  where id = d.recipient_id;

  return jsonb_build_object(
    'ok', true,
    'donation_id', d.id,
    'wallet_credited', true,
    'credit_cents', v_credit,
    'balance_after_cents', v_balance_after
  );
end;
$$;

comment on function complete_donation is
  'Sole path to mark a donation succeeded and credit the recipient wallet/ledger';

comment on column pollis.voice_keepsake is
  'True when starter added a $1 private voice keepsake at launch.';
comment on column pollis.private_note is
  'Private note for the recipient only (typed or transcribed from voice).';

revoke all on function complete_donation(uuid, bigint) from public, anon, authenticated;
grant execute on function complete_donation(uuid, bigint) to service_role;
