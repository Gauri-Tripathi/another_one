create table if not exists public.activity_segments (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  seconds double precision not null check (seconds >= 0),
  app_name text not null,
  window_title text not null default '',
  category text not null check (category in ('productive', 'distraction', 'neutral')),
  confidence real not null default 0,
  reason text not null default '',
  manual boolean not null default false,
  website text,
  app_session_id uuid,
  site_session_id uuid,
  updated_at timestamptz not null default now()
);

alter table public.activity_segments enable row level security;

create policy "People can read their own activity"
on public.activity_segments for select
using (auth.uid() = user_id);

create policy "People can insert their own activity"
on public.activity_segments for insert
with check (auth.uid() = user_id);

create policy "People can update their own activity"
on public.activity_segments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists activity_segments_user_started_idx
on public.activity_segments (user_id, started_at desc);
