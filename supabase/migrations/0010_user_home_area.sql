-- Optional home area for nearby feed ranking (prompted lightly after signup).

alter table users
  add column if not exists home_city text,
  add column if not exists home_region text,
  add column if not exists home_area_prompted_at timestamptz;

comment on column users.home_city is
  'Optional city for nearby Polli feed ranking.';
comment on column users.home_region is
  'Optional state/region code (e.g. NY) for nearby feed ranking.';
comment on column users.home_area_prompted_at is
  'When the user was asked for home area (set on save or skip so we do not re-prompt).';

create index if not exists users_home_region_idx
  on users (home_region)
  where home_region is not null;
