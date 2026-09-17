alter table public.stores
  add column if not exists categories text[] not null default '{}',
  add column if not exists banner_urls text[] not null default '{}';

create index if not exists stores_categories_gin_idx
  on public.stores using gin (categories);