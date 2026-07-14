-- Voice story fields on nominations + public storage bucket for audio clips.

alter table nominations
  add column if not exists story_audio_url text,
  add column if not exists story_audio_duration_ms integer,
  add column if not exists story_words jsonb,
  add column if not exists story_signatures jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-audio',
  'story-audio',
  true,
  26214400,
  array['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'video/webm']
)
on conflict (id) do nothing;

create policy "story audio public read"
  on storage.objects for select
  using (bucket_id = 'story-audio');

create policy "story audio authenticated upload"
  on storage.objects for insert
  with check (bucket_id = 'story-audio' and auth.role() = 'authenticated');

create policy "story audio owner update"
  on storage.objects for update
  using (bucket_id = 'story-audio' and auth.uid() = owner);

create policy "story audio owner delete"
  on storage.objects for delete
  using (bucket_id = 'story-audio' and auth.uid() = owner);
