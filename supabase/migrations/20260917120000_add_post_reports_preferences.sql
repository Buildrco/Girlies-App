create table if not exists public.post_reports (
  post_id uuid references public.posts(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete cascade,
  reason text not null default 'reported_from_viewer',
  created_at timestamptz not null default now(),
  primary key (post_id, reporter_id)
);

create table if not exists public.post_preferences (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  preference text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, preference),
  check (preference in ('not_interested'))
);

alter table public.post_reports enable row level security;
alter table public.post_preferences enable row level security;

drop policy if exists post_reports_insert_own on public.post_reports;
create policy post_reports_insert_own on public.post_reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists post_reports_read_own on public.post_reports;
create policy post_reports_read_own on public.post_reports
  for select using (auth.uid() = reporter_id);

drop policy if exists post_preferences_read_own on public.post_preferences;
create policy post_preferences_read_own on public.post_preferences
  for select using (auth.uid() = user_id);

drop policy if exists post_preferences_insert_own on public.post_preferences;
create policy post_preferences_insert_own on public.post_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists post_preferences_update_own on public.post_preferences;
create policy post_preferences_update_own on public.post_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists post_preferences_delete_own on public.post_preferences;
create policy post_preferences_delete_own on public.post_preferences
  for delete using (auth.uid() = user_id);