create or replace function public.get_seller_studio_traffic_sources(p_store_id uuid, p_start timestamptz default now() - interval '30 days', p_end timestamptz default now()) returns table(source text, events bigint) language plpgsql security definer set search_path = public as $$
declare v_owner_id uuid;
begin
 select s.owner_id into v_owner_id from public.stores s where s.id=p_store_id;
 if v_owner_id is null or v_owner_id <> auth.uid() then raise exception 'Not allowed'; end if;
 return query select coalesce(nullif(e.source,''),'Other'), count(*) from public.seller_events e where e.store_id=p_store_id and e.actor_id is distinct from v_owner_id and e.created_at between p_start and p_end group by coalesce(nullif(e.source,''),'Other') order by count(*) desc;
end; $$;
grant execute on function public.get_seller_studio_traffic_sources(uuid,timestamptz,timestamptz) to authenticated;