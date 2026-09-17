-- Run once in your existing Supabase project's SQL editor before syncing v0.8.
-- Keeps every existing row, and accepts sub-second activity durations.
alter table public.activity_segments alter column seconds type double precision using seconds::double precision;
