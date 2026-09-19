create table if not exists public.seller_planned_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  banner_url text,
  event_mode text not null default 'online' check (event_mode in ('online','physical')),
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  ticket_price numeric(12,2) not null default 0 check (ticket_price >= 0),
  ticket_quantity integer not null default 100 check (ticket_quantity > 0),
  tickets_sold integer not null default 0 check (tickets_sold >= 0),
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.seller_event_ticket_orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.seller_planned_events(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  total_amount numeric(12,2) not null default 0,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists seller_planned_events_store_idx on public.seller_planned_events(store_id, starts_at);
create index if not exists seller_event_ticket_orders_buyer_idx on public.seller_event_ticket_orders(buyer_id, created_at desc);
alter table public.seller_planned_events enable row level security;
alter table public.seller_event_ticket_orders enable row level security;
drop policy if exists seller_planned_events_public_read on public.seller_planned_events;
create policy seller_planned_events_public_read on public.seller_planned_events for select using (published = true or owner_id = auth.uid());
drop policy if exists seller_planned_events_owner_insert on public.seller_planned_events;
create policy seller_planned_events_owner_insert on public.seller_planned_events for insert with check (owner_id = auth.uid() and exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
drop policy if exists seller_planned_events_owner_update on public.seller_planned_events;
create policy seller_planned_events_owner_update on public.seller_planned_events for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists seller_planned_events_owner_delete on public.seller_planned_events;
create policy seller_planned_events_owner_delete on public.seller_planned_events for delete using (owner_id = auth.uid());
drop policy if exists seller_event_orders_buyer_read on public.seller_event_ticket_orders;
create policy seller_event_orders_buyer_read on public.seller_event_ticket_orders for select using (buyer_id = auth.uid() or exists (select 1 from public.seller_planned_events e where e.id = event_id and e.owner_id = auth.uid()));
create or replace function public.purchase_seller_event_ticket(p_event_id uuid, p_quantity integer default 1) returns uuid language plpgsql security definer set search_path = public as $$
declare v_event public.seller_planned_events; v_order_id uuid;
begin
 if auth.uid() is null then raise exception 'Please sign in to get a ticket.'; end if;
 if p_quantity is null or p_quantity < 1 then raise exception 'Ticket quantity must be at least one.'; end if;
 select * into v_event from public.seller_planned_events where id = p_event_id and published = true for update;
 if v_event.id is null then raise exception 'Event not found.'; end if;
 if v_event.tickets_sold + p_quantity > v_event.ticket_quantity then raise exception 'Not enough tickets available.'; end if;
 update public.seller_planned_events set tickets_sold = tickets_sold + p_quantity where id = p_event_id;
 insert into public.seller_event_ticket_orders(event_id,buyer_id,quantity,total_amount) values (p_event_id,auth.uid(),p_quantity,v_event.ticket_price*p_quantity) returning id into v_order_id;
 return v_order_id;
end; $$;
grant execute on function public.purchase_seller_event_ticket(uuid,integer) to authenticated;