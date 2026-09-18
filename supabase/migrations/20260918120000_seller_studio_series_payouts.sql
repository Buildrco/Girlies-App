create or replace function public.get_seller_studio_series(p_store_id uuid, p_start timestamptz default now() - interval '30 days', p_end timestamptz default now()) returns jsonb language sql security definer set search_path = public as $$
  with days as (select generate_series(date_trunc('day', p_start), date_trunc('day', p_end), interval '1 day') as day)
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', to_char(days.day, 'YYYY-MM-DD'),
    'revenue', coalesce((select sum(o.subtotal) from public.orders o where o.store_id = p_store_id and o.created_at >= days.day and o.created_at < days.day + interval '1 day' and lower(coalesce(o.payment_status,'')) in ('paid','success','successful','completed')), 0),
    'orders', (select count(*) from public.orders o where o.store_id = p_store_id and o.created_at >= days.day and o.created_at < days.day + interval '1 day'),
    'visitors', (select count(distinct coalesce(nullif(e.session_id,''), e.actor_id::text, e.id::text)) from public.seller_events e where e.store_id = p_store_id and e.created_at >= days.day and e.created_at < days.day + interval '1 day'),
    'views', (select count(*) from public.seller_events e where e.store_id = p_store_id and e.event_type in ('impression','view') and e.created_at >= days.day and e.created_at < days.day + interval '1 day'),
    'purchases', (select count(*) from public.orders o where o.store_id = p_store_id and o.created_at >= days.day and o.created_at < days.day + interval '1 day' and lower(coalesce(o.payment_status,'')) in ('paid','success','successful','completed'))
  ) order by days.day), '[]'::jsonb) from days
  where exists (select 1 from public.stores s where s.id = p_store_id and s.owner_id = auth.uid());
$$;
grant execute on function public.get_seller_studio_series(uuid,timestamptz,timestamptz) to authenticated;

create or replace function public.request_seller_payout(p_store_id uuid, p_amount numeric) returns jsonb language plpgsql security definer set search_path = public as $$
declare available numeric; payout jsonb;
begin
  if not exists (select 1 from public.stores s where s.id = p_store_id and s.owner_id = auth.uid()) then raise exception 'Not allowed'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Withdrawal amount must be greater than zero'; end if;
  select greatest(0, coalesce((select sum(o.subtotal) from public.orders o where o.store_id = p_store_id and lower(coalesce(o.payment_status,'')) in ('paid','success','successful','completed')),0) - coalesce((select sum(p.amount) from public.seller_payouts p where p.store_id = p_store_id and lower(p.status) in ('pending','paid','completed')),0)) into available;
  if p_amount > available then raise exception 'Withdrawal amount exceeds available balance'; end if;
  insert into public.seller_payouts(store_id, amount, status, reference) values (p_store_id, p_amount, 'pending', 'payout_' || replace(gen_random_uuid()::text, '-', '')) returning jsonb_build_object('id', id, 'amount', amount, 'status', status, 'created_at', created_at) into payout;
  return payout;
end; $$;
grant execute on function public.request_seller_payout(uuid,numeric) to authenticated;
