create table if not exists public.seller_events (id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade, product_id uuid references public.products(id) on delete cascade, actor_id uuid references public.profiles(id) on delete set null, session_id text, event_type text not null check (event_type in ('impression','view','engagement','product_click','cart','checkout','purchase')), source text not null default 'Shop', metadata jsonb not null default '{}', created_at timestamptz not null default now());
create index if not exists seller_events_store_created_idx on public.seller_events(store_id, created_at desc);
create index if not exists seller_events_product_idx on public.seller_events(product_id, event_type, created_at desc);
create table if not exists public.seller_payouts (id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade, amount numeric(12,2) not null check (amount >= 0), status text not null default 'pending', reference text unique, created_at timestamptz not null default now());
create index if not exists seller_payouts_store_created_idx on public.seller_payouts(store_id, created_at desc);
alter table public.seller_events enable row level security;
alter table public.seller_payouts enable row level security;
drop policy if exists seller_events_insert_own on public.seller_events;
create policy seller_events_insert_own on public.seller_events for insert with check (actor_id is null or auth.uid() = actor_id);
drop policy if exists seller_events_read_owner on public.seller_events;
create policy seller_events_read_owner on public.seller_events for select using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists seller_payouts_read_owner on public.seller_payouts;
create policy seller_payouts_read_owner on public.seller_payouts for select using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
-- The live database function is applied through Supabase MCP so metrics stay server-authoritative.