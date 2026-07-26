-- Voice keepsake flag + private note on nominations (nominator kickoff add-on).

alter table nominations
  add column if not exists voice_keepsake boolean not null default false,
  add column if not exists private_note text;

comment on column nominations.voice_keepsake is
  'True when nominator added a $1 private voice keepsake at launch.';
comment on column nominations.private_note is
  'Private note for the nominee only (typed or transcribed from voice).';
