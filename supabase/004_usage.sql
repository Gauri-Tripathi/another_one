-- Run once for existing projects before enabling sync in version 0.4.
alter table public.activity_segments add column if not exists website text;
alter table public.activity_segments add column if not exists app_session_id uuid;
alter table public.activity_segments add column if not exists site_session_id uuid;
