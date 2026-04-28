-- Polli schema
-- Users map 1:1 to auth.users (Supabase Auth) via id = auth.uid()
-- Nominations are public-readable; Donations and Notes are readable by anyone (counts + notes)
-- Only the nominator/nominee can edit their own records. Stripe Connect account IDs are server-only.

create extension if not exists "uuid-ossp";

-- ─── Categories ──────────────────────────────────────────────────────────────
create table categories (
  id         text primary key,
  emoji      text not null,
  title      text not null,
  sub        text not null
);

insert into categories (id, emoji, title, sub) values
  ('just-because','🌼','Just Because','A little cheer'),
  ('birthday','🎂','Birthday','Another trip around'),
  ('hard-time','🤍','Hard Time','A lift when needed'),
  ('teacher','🍎','Amazing Teacher','An A+ in everything'),
  ('nurse','🩺','Healthcare Hero','Quiet, steady care'),
  ('new-parent','🍼','New Parent','Small hands, long days'),
  ('thanks','✨','Thank You','You saw me'),
  ('community','🌿','Community','The glue of a block');

-- ─── Users (profile table — mirrors auth.users) ──────────────────────────────
create table users (
  id                 uuid primary key references auth.users on delete cascade,
  display_name       text,
  first_name         text,
  last_name          text,
  email              text,
  phone              text,
  avatar_emoji       text,

  -- Eligibility: a user is eligible to be nominated if they have given in the last 12 months.
  -- Computed by a trigger on donations, cached here.
  last_given_at      timestamptz,

  -- Stripe (server-only; RLS blocks clients)
  stripe_customer_id text,
  stripe_connect_id  text,  -- Connect Express account (populated on first payout)
  connect_ready      boolean default false,

  -- YTD received-amount for silent $600 cap
  ytd_received_cents integer default 0,
  ytd_year           integer default extract(year from now())::integer,

  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index users_stripe_connect_idx on users (stripe_connect_id);

-- ─── Nominations ─────────────────────────────────────────────────────────────
create type nomination_status as enum ('draft','live','closed','paid_out','cancelled');

create table nominations (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  nominator_id  uuid not null references users(id),
  -- Nominee may not have a user row yet; we track name + contact until they sign up
  nominee_id    uuid references users(id),
  nominee_first text not null,
  nominee_last  text not null,
  nominee_email text,
  nominee_phone text,
  cat_id        text not null references categories(id),
  story         text not null,
  timeline_days integer not null check (timeline_days in (7,14,30)),
  status        nomination_status not null default 'draft',
  started_at    timestamptz default now(),
  closes_at     timestamptz not null,
  paid_out_at   timestamptz,
  payout_amount_cents integer,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index nominations_slug_idx on nominations (slug);
create index nominations_status_idx on nominations (status, closes_at);
create index nominations_nominator_idx on nominations (nominator_id);
create index nominations_nominee_idx on nominations (nominee_id) where nominee_id is not null;

-- Computed columns for feed: count of donations + running total. Materialized via triggers.
alter table nominations add column backer_count integer default 0;
alter table nominations add column raised_cents integer default 0;

-- ─── Donations ───────────────────────────────────────────────────────────────
create type donation_status as enum ('pending','succeeded','failed','refunded');

create table donations (
  id                        uuid primary key default uuid_generate_v4(),
  nomination_id             uuid not null references nominations(id) on delete cascade,
  donor_id                  uuid references users(id),  -- nullable for guest (rare), attributed later
  amount_cents              integer not null default 100 check (amount_cents = 100),
  fee_covered               boolean not null default true,
  total_charged_cents       integer not null,           -- 100 or 143
  net_to_nominee_cents      integer not null,           -- 100 if covered, 57 if not
  platform_fee_cents        integer not null,
  stripe_payment_intent_id  text unique,
  status                    donation_status not null default 'pending',
  note                      text,
  anonymous                 boolean not null default false,
  created_at                timestamptz default now()
);

create index donations_nomination_idx on donations (nomination_id, status);
create index donations_donor_idx on donations (donor_id) where donor_id is not null;

-- Bump nomination counts on successful donation
create or replace function after_donation_succeeded() returns trigger language plpgsql as $$
begin
  if new.status = 'succeeded' and (old is null or old.status <> 'succeeded') then
    update nominations
      set backer_count = backer_count + 1,
          raised_cents = raised_cents + new.net_to_nominee_cents,
          updated_at = now()
      where id = new.nomination_id;

    -- Mark donor eligible for 12 months
    if new.donor_id is not null then
      update users set last_given_at = now() where id = new.donor_id;
    end if;

    -- Credit recipient YTD for silent $600 cap (only when nominee_id is attached)
    update users u
      set ytd_received_cents = case
            when u.ytd_year = extract(year from now())::integer
              then u.ytd_received_cents + new.net_to_nominee_cents
            else new.net_to_nominee_cents
          end,
          ytd_year = extract(year from now())::integer
      from nominations n
      where n.id = new.nomination_id and u.id = n.nominee_id;
  end if;
  return new;
end $$;

create trigger donation_succeeded_trigger
  after insert or update on donations
  for each row execute function after_donation_succeeded();

-- ─── Notes (denormalized from donations for fast read) ───────────────────────
-- Actually, note lives on the donation row. A view gives us nicely shaped "notes with avatar" per nomination.
create or replace view nomination_notes as
  select
    d.id as donation_id,
    d.nomination_id,
    d.created_at,
    d.anonymous,
    case when d.anonymous then 'anonymous bee' else coalesce(u.display_name, u.first_name, 'friend') end as from_name,
    case when d.anonymous then '🐝' else upper(substring(coalesce(u.first_name, 'A') for 1)) end as avatar,
    d.note
  from donations d
  left join users u on u.id = d.donor_id
  where d.note is not null and d.note <> '' and d.status = 'succeeded'
  order by d.created_at desc;

-- ─── RLS policies ────────────────────────────────────────────────────────────
alter table users enable row level security;
alter table nominations enable row level security;
alter table donations enable row level security;

-- users: read your own profile, or a minimal public projection of others
create policy "users select self" on users for select using (auth.uid() = id);
create policy "users update self" on users for update using (auth.uid() = id);
create policy "users insert self" on users for insert with check (auth.uid() = id);

-- nominations: anyone authenticated can read live/closed ones; creator or nominee can edit
create policy "nominations public read" on nominations for select using (
  status in ('live','closed','paid_out') or nominator_id = auth.uid() or nominee_id = auth.uid()
);
create policy "nominations nominator insert" on nominations for insert
  with check (nominator_id = auth.uid());
create policy "nominations nominator update" on nominations for update
  using (nominator_id = auth.uid() or nominee_id = auth.uid());

-- donations: a donor sees their own donations; anyone authenticated sees donations for any live nomination (for giver counts + notes)
create policy "donations self" on donations for select using (donor_id = auth.uid());
create policy "donations public per nomination" on donations for select using (
  exists (select 1 from nominations n where n.id = donations.nomination_id and n.status in ('live','closed','paid_out'))
);
-- Inserts/updates to donations happen ONLY from Edge Functions via the service role key.
-- No client policies for insert/update.

-- ─── updated_at triggers ─────────────────────────────────────────────────────
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger users_touch before update on users for each row execute function touch_updated_at();
create trigger nominations_touch before update on nominations for each row execute function touch_updated_at();

-- ─── Helpers ─────────────────────────────────────────────────────────────────
-- Slugify a name into a polli.to URL segment; called when inserting a nomination.
create or replace function slugify(input text) returns text language sql immutable as $$
  select regexp_replace(regexp_replace(lower(input), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
$$;

create or replace function generate_nomination_slug() returns trigger language plpgsql as $$
declare base text; candidate text; n int := 0;
begin
  base := slugify(new.nominee_first || '-' || new.nominee_last);
  if base = '' or base is null then base := 'friend'; end if;
  candidate := base;
  while exists (select 1 from nominations where slug = candidate and id <> new.id) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  new.slug := candidate;
  return new;
end $$;

create trigger nominations_slug_trigger before insert on nominations
  for each row when (new.slug is null or new.slug = '')
  execute function generate_nomination_slug();

-- Auto-set closes_at on insert if not provided
create or replace function set_nomination_closes_at() returns trigger language plpgsql as $$
begin
  if new.closes_at is null then
    new.closes_at := now() + (new.timeline_days || ' days')::interval;
  end if;
  return new;
end $$;

create trigger nominations_closes_at before insert on nominations
  for each row execute function set_nomination_closes_at();
