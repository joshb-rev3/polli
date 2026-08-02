-- Billing ZIP captured from Stripe Checkout / PaymentMethod (nearby feed signal).

alter table users
  add column if not exists home_zip text;

comment on column users.home_zip is
  'Postal code from Stripe billing or optional profile entry; used for nearby feed ranking.';

create index if not exists users_home_zip_idx
  on users (home_zip)
  where home_zip is not null;
