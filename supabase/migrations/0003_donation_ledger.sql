-- Donation ledger: wallets + append-only ledger as source of truth,
-- annual recipient caps, cashout/gift-card rails. Evolves nominations/donations
-- in place (no campaigns rename). Moves off Stripe destination charges —
-- recipient balance lives in wallets until cashout.

-- ─── ENUM TYPES ──────────────────────────────────────────────────────────────
create type ledger_entry_type as enum (
  'donation_received',
  'donation_sent',
  'cashout_debit',
  'cashout_reversal',
  'giftcard_debit',
  'giftcard_reversal',
  'manual_adjustment',
  'escheatment_debit'
);

create type payout_status as enum (
  'pending',
  'in_transit',
  'paid',
  'failed',
  'canceled'
);

create type giftcard_status as enum (
  'pending',
  'delivered',
  'redeemed',
  'failed',
  'expired',
  'canceled'
);

-- ─── USERS — activity / KYC fields this system needs ─────────────────────────
alter table users
  add column if not exists kyc_status text not null default 'unverified',
  add column if not exists last_activity_at timestamptz not null default now();

comment on column users.kyc_status is
  'unverified | pending | verified | rejected — Stripe Connect KYC mirror; required before first cashout';
comment on column users.ytd_received_cents is
  'DEPRECATED: kept in sync for backward compat; prefer recipient_annual_totals';
comment on column users.ytd_year is
  'DEPRECATED: kept in sync for backward compat; prefer recipient_annual_totals';

-- ─── WALLETS — one row per user, cached balance + lifetime stats ─────────────
create table wallets (
  user_id uuid primary key references users(id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  lifetime_received_cents bigint not null default 0,
  lifetime_donated_cents bigint not null default 0,
  lifetime_cashed_out_cents bigint not null default 0,
  lifetime_giftcard_redeemed_cents bigint not null default 0,

  dormant_since timestamptz,
  escheated_at timestamptz,
  escheated_amount_cents bigint,
  escheated_state text,

  updated_at timestamptz not null default now()
);

create trigger wallets_touch before update on wallets
  for each row execute function touch_updated_at();

-- ─── RECIPIENT ANNUAL CAP ($600/calendar year, configurable in RPC) ──────────
create table recipient_annual_totals (
  recipient_id uuid not null references users(id) on delete cascade,
  calendar_year integer not null,
  total_received_cents bigint not null default 0,
  donation_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (recipient_id, calendar_year)
);

create trigger recipient_annual_totals_touch before update on recipient_annual_totals
  for each row execute function touch_updated_at();

-- Backfill from legacy users.ytd_* columns
insert into recipient_annual_totals (recipient_id, calendar_year, total_received_cents, donation_count)
select id, ytd_year, coalesce(ytd_received_cents, 0), 0
from users
where coalesce(ytd_received_cents, 0) > 0
on conflict (recipient_id, calendar_year) do nothing;

-- ─── DONATIONS — harden with recipient, idempotency, one-per-nomination ──────
alter table donations
  add column if not exists recipient_id uuid references users(id),
  add column if not exists idempotency_key text,
  add column if not exists completed_at timestamptz,
  add column if not exists failure_reason text;

-- Backfill recipient_id from nomination nominee
update donations d
set recipient_id = n.nominee_id
from nominations n
where n.id = d.nomination_id
  and d.recipient_id is null
  and n.nominee_id is not null;

-- Backfill idempotency keys for existing rows (stripe PI id is stable when present)
update donations
set idempotency_key = coalesce(
  'legacy:' || stripe_payment_intent_id,
  'legacy:' || id::text
)
where idempotency_key is null;

alter table donations
  alter column idempotency_key set not null;

create unique index if not exists donations_idempotency_key_uidx
  on donations (idempotency_key);

-- One $1 gift per donor per nomination while pending or succeeded.
-- Failed/refunded rows do not permanently block a retry.
create unique index if not exists one_donation_per_donor_per_nomination
  on donations (donor_id, nomination_id)
  where donor_id is not null
    and status in ('pending', 'succeeded');

create index if not exists idx_donations_recipient
  on donations (recipient_id, created_at)
  where recipient_id is not null;

alter table donations
  drop constraint if exists no_self_donation;

alter table donations
  add constraint no_self_donation
  check (donor_id is null or recipient_id is null or donor_id <> recipient_id);

-- ─── LEDGER ENTRIES — append-only source of truth ────────────────────────────
create table ledger_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  entry_type ledger_entry_type not null,
  amount_cents bigint not null,              -- positive = credit, negative = debit
  balance_after_cents bigint not null,
  reference_table text not null,             -- donations | payouts | gift_card_redemptions | manual
  reference_id uuid,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  notes text
);

create index idx_ledger_entries_user on ledger_entries (user_id, created_at);
create index idx_ledger_entries_reference on ledger_entries (reference_table, reference_id);

-- ─── PAYOUTS — Stripe Connect cash-out path ──────────────────────────────────
create table payouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  stripe_payout_id text,
  stripe_transfer_id text,
  amount_cents bigint not null check (amount_cents > 0),
  method text not null default 'standard',   -- standard | instant
  fee_cents bigint not null default 0,
  status payout_status not null default 'pending',
  idempotency_key text not null unique,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  failure_reason text
);

create index idx_payouts_user on payouts (user_id, requested_at);

-- ─── GIFT CARD REDEMPTIONS ───────────────────────────────────────────────────
create table gift_card_redemptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  provider text not null,                    -- tremendous | tango | giftbit
  provider_order_id text,
  brand text,
  amount_cents bigint not null check (amount_cents > 0),
  status giftcard_status not null default 'pending',
  idempotency_key text not null unique,
  redemption_url text,
  requested_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  failure_reason text
);

create index idx_giftcards_user on gift_card_redemptions (user_id, requested_at);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table wallets enable row level security;
alter table recipient_annual_totals enable row level security;
alter table ledger_entries enable row level security;
alter table payouts enable row level security;
alter table gift_card_redemptions enable row level security;

-- Users read their own wallet / ledger / payouts / gift cards.
-- Annual totals stay server-only (silent cap — never client-facing).
-- All mutations go through Edge Functions (service role).
create policy "wallets select self" on wallets
  for select using (auth.uid() = user_id);

create policy "ledger select self" on ledger_entries
  for select using (auth.uid() = user_id);

create policy "payouts select self" on payouts
  for select using (auth.uid() = user_id);

create policy "giftcards select self" on gift_card_redemptions
  for select using (auth.uid() = user_id);

-- ─── HELPERS ─────────────────────────────────────────────────────────────────
create or replace function ensure_wallet(p_user_id uuid)
returns wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  w wallets;
begin
  insert into wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into w from wallets where user_id = p_user_id for update;
  return w;
end;
$$;

-- Atomic donation completion: lock wallet → cap check → ledger → aggregates.
-- Idempotent on ledger_entries.idempotency_key / already-succeeded donations.
-- Credits net_to_nominee_cents (100 if fees covered, 57 if not).
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
  n nominations;
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

  select * into n from nominations where id = d.nomination_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'nomination_not_found');
  end if;

  if n.status not in ('live', 'closed') then
    return jsonb_build_object('ok', false, 'error', 'nomination_not_accepting');
  end if;

  v_credit := d.net_to_nominee_cents;
  if v_credit is null or v_credit <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_credit');
  end if;

  -- Denormalize recipient from nomination when present
  if d.recipient_id is null and n.nominee_id is not null then
    d.recipient_id := n.nominee_id;
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

  -- Cap check BEFORE any mutation (row lock). Prefer soft reject at PI create;
  -- if this races after capture, leave donation pending for ops/refund.
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

  -- Mark succeeded + bump nomination aggregates
  update donations
  set status = 'succeeded',
      recipient_id = d.recipient_id,
      completed_at = now()
  where id = d.id;

  update nominations
  set backer_count = backer_count + 1,
      raised_cents = raised_cents + v_credit,
      updated_at = now()
  where id = n.id;

  if d.donor_id is not null then
    update users
    set last_given_at = now(),
        last_activity_at = now()
    where id = d.donor_id;
  end if;

  -- No nominee attached yet: nomination totals updated; wallet credit deferred
  if d.recipient_id is null then
    return jsonb_build_object(
      'ok', true,
      'donation_id', d.id,
      'wallet_credited', false,
      'reason', 'nominee_unlinked'
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

  -- Keep deprecated users.ytd_* in sync for any leftover readers
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

-- Cashout: lock wallet → pending payout → ledger debit → decrement balance.
-- Stripe transfer/payout happens after this returns; webhooks reverse on failure.
create or replace function initiate_cashout(
  p_user_id uuid,
  p_amount_cents bigint,
  p_idempotency_key text,
  p_method text default 'standard',
  p_fee_cents bigint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w wallets;
  v_payout payouts;
  v_balance_after bigint;
  v_ledger_key text;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount');
  end if;

  if exists (select 1 from payouts where idempotency_key = p_idempotency_key) then
    select * into v_payout from payouts where idempotency_key = p_idempotency_key;
    return jsonb_build_object('ok', true, 'idempotent', true, 'payout_id', v_payout.id);
  end if;

  w := ensure_wallet(p_user_id);
  if w.balance_cents < p_amount_cents then
    return jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  end if;

  insert into payouts (
    user_id, amount_cents, method, fee_cents, status, idempotency_key
  ) values (
    p_user_id, p_amount_cents, p_method, p_fee_cents, 'pending', p_idempotency_key
  )
  returning * into v_payout;

  v_balance_after := w.balance_cents - p_amount_cents;
  v_ledger_key := 'cashout_debit:' || v_payout.id::text;

  insert into ledger_entries (
    user_id, entry_type, amount_cents, balance_after_cents,
    reference_table, reference_id, idempotency_key
  ) values (
    p_user_id, 'cashout_debit', -p_amount_cents, v_balance_after,
    'payouts', v_payout.id, v_ledger_key
  );

  update wallets
  set balance_cents = v_balance_after,
      lifetime_cashed_out_cents = lifetime_cashed_out_cents + p_amount_cents,
      updated_at = now()
  where user_id = p_user_id;

  update users set last_activity_at = now() where id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'payout_id', v_payout.id,
    'balance_after_cents', v_balance_after
  );
end;
$$;

-- Reverse a failed cashout (append-only credit; never mutate original debit).
create or replace function reverse_cashout(
  p_payout_id uuid,
  p_failure_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p payouts;
  w wallets;
  v_balance_after bigint;
  v_ledger_key text;
begin
  select * into p from payouts where id = p_payout_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'payout_not_found');
  end if;

  if p.status in ('failed', 'canceled') then
    return jsonb_build_object('ok', true, 'idempotent', true, 'payout_id', p.id);
  end if;

  v_ledger_key := 'cashout_reversal:' || p.id::text;
  if exists (select 1 from ledger_entries where idempotency_key = v_ledger_key) then
    update payouts
    set status = 'failed',
        failure_reason = coalesce(p_failure_reason, failure_reason),
        completed_at = coalesce(completed_at, now())
    where id = p.id;
    return jsonb_build_object('ok', true, 'idempotent', true, 'payout_id', p.id);
  end if;

  w := ensure_wallet(p.user_id);
  v_balance_after := w.balance_cents + p.amount_cents;

  insert into ledger_entries (
    user_id, entry_type, amount_cents, balance_after_cents,
    reference_table, reference_id, idempotency_key, notes
  ) values (
    p.user_id, 'cashout_reversal', p.amount_cents, v_balance_after,
    'payouts', p.id, v_ledger_key, p_failure_reason
  );

  update wallets
  set balance_cents = v_balance_after,
      lifetime_cashed_out_cents = greatest(0, lifetime_cashed_out_cents - p.amount_cents),
      updated_at = now()
  where user_id = p.user_id;

  update payouts
  set status = 'failed',
      failure_reason = p_failure_reason,
      completed_at = now()
  where id = p.id;

  return jsonb_build_object(
    'ok', true,
    'payout_id', p.id,
    'balance_after_cents', v_balance_after
  );
end;
$$;

-- Gift-card redemption: same pattern as cashout.
create or replace function initiate_giftcard_redemption(
  p_user_id uuid,
  p_amount_cents bigint,
  p_provider text,
  p_idempotency_key text,
  p_brand text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w wallets;
  r gift_card_redemptions;
  v_balance_after bigint;
  v_ledger_key text;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount');
  end if;

  if exists (select 1 from gift_card_redemptions where idempotency_key = p_idempotency_key) then
    select * into r from gift_card_redemptions where idempotency_key = p_idempotency_key;
    return jsonb_build_object('ok', true, 'idempotent', true, 'redemption_id', r.id);
  end if;

  w := ensure_wallet(p_user_id);
  if w.balance_cents < p_amount_cents then
    return jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  end if;

  insert into gift_card_redemptions (
    user_id, provider, brand, amount_cents, status, idempotency_key
  ) values (
    p_user_id, p_provider, p_brand, p_amount_cents, 'pending', p_idempotency_key
  )
  returning * into r;

  v_balance_after := w.balance_cents - p_amount_cents;
  v_ledger_key := 'giftcard_debit:' || r.id::text;

  insert into ledger_entries (
    user_id, entry_type, amount_cents, balance_after_cents,
    reference_table, reference_id, idempotency_key
  ) values (
    p_user_id, 'giftcard_debit', -p_amount_cents, v_balance_after,
    'gift_card_redemptions', r.id, v_ledger_key
  );

  update wallets
  set balance_cents = v_balance_after,
      lifetime_giftcard_redeemed_cents = lifetime_giftcard_redeemed_cents + p_amount_cents,
      updated_at = now()
  where user_id = p_user_id;

  update users set last_activity_at = now() where id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'redemption_id', r.id,
    'balance_after_cents', v_balance_after
  );
end;
$$;

create or replace function reverse_giftcard_redemption(
  p_redemption_id uuid,
  p_failure_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r gift_card_redemptions;
  w wallets;
  v_balance_after bigint;
  v_ledger_key text;
begin
  select * into r from gift_card_redemptions where id = p_redemption_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'redemption_not_found');
  end if;

  if r.status in ('failed', 'canceled') then
    return jsonb_build_object('ok', true, 'idempotent', true, 'redemption_id', r.id);
  end if;

  v_ledger_key := 'giftcard_reversal:' || r.id::text;
  if exists (select 1 from ledger_entries where idempotency_key = v_ledger_key) then
    update gift_card_redemptions
    set status = 'failed',
        failure_reason = coalesce(p_failure_reason, failure_reason)
    where id = r.id;
    return jsonb_build_object('ok', true, 'idempotent', true, 'redemption_id', r.id);
  end if;

  w := ensure_wallet(r.user_id);
  v_balance_after := w.balance_cents + r.amount_cents;

  insert into ledger_entries (
    user_id, entry_type, amount_cents, balance_after_cents,
    reference_table, reference_id, idempotency_key, notes
  ) values (
    r.user_id, 'giftcard_reversal', r.amount_cents, v_balance_after,
    'gift_card_redemptions', r.id, v_ledger_key, p_failure_reason
  );

  update wallets
  set balance_cents = v_balance_after,
      lifetime_giftcard_redeemed_cents = greatest(0, lifetime_giftcard_redeemed_cents - r.amount_cents),
      updated_at = now()
  where user_id = r.user_id;

  update gift_card_redemptions
  set status = 'failed',
      failure_reason = p_failure_reason
  where id = r.id;

  return jsonb_build_object(
    'ok', true,
    'redemption_id', r.id,
    'balance_after_cents', v_balance_after
  );
end;
$$;

-- Replace legacy trigger: counters + YTD now live in complete_donation.
-- Keep a thin guard so direct status updates without the RPC cannot double-count
-- if someone bypasses the webhook — they must call complete_donation.
create or replace function after_donation_succeeded() returns trigger
language plpgsql
as $$
begin
  -- Intentionally no-op for aggregate mutation.
  -- complete_donation() is the sole path for succeeded donations going forward.
  -- Legacy rows that flipped to succeeded before this migration already have
  -- nomination counters / ytd applied by the previous trigger.
  return new;
end;
$$;

comment on function complete_donation is
  'Sole path to mark a donation succeeded and credit the recipient wallet/ledger';
comment on function initiate_cashout is
  'Debit wallet + append cashout_debit ledger row; then execute Stripe Connect payout';
comment on function initiate_giftcard_redemption is
  'Debit wallet + append giftcard_debit ledger row; then place provider order';

-- RPC surface: service role only (Edge Functions). Not callable from anon/authenticated.
revoke all on function ensure_wallet(uuid) from public, anon, authenticated;
revoke all on function complete_donation(uuid, bigint) from public, anon, authenticated;
revoke all on function initiate_cashout(uuid, bigint, text, text, bigint) from public, anon, authenticated;
revoke all on function reverse_cashout(uuid, text) from public, anon, authenticated;
revoke all on function initiate_giftcard_redemption(uuid, bigint, text, text, text) from public, anon, authenticated;
revoke all on function reverse_giftcard_redemption(uuid, text) from public, anon, authenticated;

grant execute on function ensure_wallet(uuid) to service_role;
grant execute on function complete_donation(uuid, bigint) to service_role;
grant execute on function initiate_cashout(uuid, bigint, text, text, bigint) to service_role;
grant execute on function reverse_cashout(uuid, text) to service_role;
grant execute on function initiate_giftcard_redemption(uuid, bigint, text, text, text) to service_role;
grant execute on function reverse_giftcard_redemption(uuid, text) to service_role;
