alter table public.profiles add column if not exists video_autoplay boolean not null default true;
alter table public.products add column if not exists stock_status text not null default 'in_stock';
alter table public.products add column if not exists bid_min_price numeric(12,2);
alter table public.products add column if not exists bid_ends_at timestamptz;
alter table public.services add column if not exists image_urls text[] not null default '{}';
alter table public.posts add column if not exists service_id uuid references public.services(id) on delete cascade;
alter table public.posts add column if not exists metadata jsonb not null default '{}';

create index if not exists bids_product_amount_idx on public.bids(product_id, amount desc);
alter table public.bids enable row level security;
drop policy if exists bids_read on public.bids;
create policy bids_read on public.bids for select using (true);

drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (
  coalesce(stock_status, 'in_stock') <> 'out_of_stock'
  or exists (select 1 from public.stores where stores.id = products.store_id and stores.owner_id = auth.uid())
);
drop policy if exists products_delete_own on public.products;
create policy products_delete_own on public.products for delete using (
  exists (select 1 from public.stores where stores.id = products.store_id and stores.owner_id = auth.uid())
);
drop policy if exists services_delete_own on public.services;
create policy services_delete_own on public.services for delete using (auth.uid() = owner_id);

create or replace function public.place_bid(p_product_id uuid, p_amount numeric)
returns public.bids
language plpgsql
security definer
set search_path = public
as $$
declare
  listing public.products%rowtype;
  seller_id uuid;
  top_amount numeric;
  inserted_bid public.bids;
begin
  if auth.uid() is null then raise exception 'You must be signed in to bid.'; end if;
  select * into listing from public.products where id = p_product_id;
  if listing.id is null then raise exception 'This listing is no longer available.'; end if;
  select owner_id into seller_id from public.stores where id = listing.store_id;
  if seller_id = auth.uid() then raise exception 'You cannot bid on your own listing.'; end if;
  if coalesce(listing.stock_status, 'in_stock') = 'out_of_stock' then raise exception 'This listing is out of stock.'; end if;
  if listing.bid_ends_at is not null and listing.bid_ends_at <= now() then raise exception 'This auction has ended.'; end if;
  select max(amount) into top_amount from public.bids where product_id = p_product_id;
  if p_amount <= coalesce(top_amount, listing.bid_min_price, listing.price) then raise exception 'Your bid must be higher than the current highest bid.'; end if;
  insert into public.bids(product_id, bidder_id, amount)
  values (p_product_id, auth.uid(), p_amount)
  returning * into inserted_bid;
  return inserted_bid;
end;
$$;

revoke all on function public.place_bid(uuid, numeric) from public;
grant execute on function public.place_bid(uuid, numeric) to authenticated;