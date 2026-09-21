create table if not exists public.marketplace_categories (
  slug text primary key,
  label text not null,
  subtitle text not null default '',
  icon text not null,
  color text not null,
  image text not null,
  subcategories text[] not null default '{}',
  category_group text not null check (category_group in ('main', 'marketplace')),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_categories_group_order_idx
  on public.marketplace_categories (category_group, sort_order);

alter table public.marketplace_categories enable row level security;

drop policy if exists "Anyone can read active marketplace categories" on public.marketplace_categories;
create policy "Anyone can read active marketplace categories"
  on public.marketplace_categories for select
  using (active = true);

insert into public.marketplace_categories (slug, label, subtitle, icon, color, image, subcategories, category_group, sort_order)
values
  ('shop', 'SHOP', 'Products, sellers & everyday finds', 'shop', '#FFD45A', 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1200&q=85', '{}', 'main', 0),
  ('services', 'SERVICES', 'Trusted help for every plan', 'services', '#BDE7A5', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=85', '{"Beauty & Grooming","Home & Cleaning","Repairs & Maintenance","Construction & Skilled Trades","Photography & Video","Design & Creative","Technology & Digital","Business & Professional","Education & Tutoring","Events & Entertainment","Transport & Delivery","Health & Wellness","Personal Services","Other"}', 'main', 1),
  ('events', 'EVENTS', 'Plans, places & people to see', 'events', '#FFB7C9', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85', '{"Entertainment","Music","Sports","Education & Learning","Business & Networking","Religious & Spiritual","Arts & Culture","Food & Culinary","Fashion & Beauty","Community","Family & Social","Health & Wellness","Technology","Conferences & Exhibitions","Charity & Fundraising","Other"}', 'main', 2),
  ('jobs-careers', 'JOBS & CAREERS', 'Opportunities for your next chapter', 'jobs', '#B8D7F2', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85', '{"Administration & Office","Accounting & Finance","Sales & Marketing","Technology & IT","Design & Creative","Media & Communications","Engineering","Healthcare","Education","Hospitality & Tourism","Construction & Skilled Trades","Transport & Logistics","Retail & Customer Service","Legal & Professional","Agriculture","Government & NGO","Other"}', 'main', 3),
  ('property', 'PROPERTY', 'Homes, land & spaces to make yours', 'property', '#D9C7A8', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85', '{"Houses","Apartments","Land","Commercial Property","Offices","Shops & Retail","Warehouses","Industrial Property","Student Accommodation","Short-Stay","Other"}', 'main', 4),
  ('vehicles', 'VEHICLES', 'Cars, bikes & everything that moves', 'vehicles', '#B89CFF', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85', '{"Cars","Motorcycles","Trucks","Vans","Buses","Trailers","Heavy Equipment","Boats","Other"}', 'main', 5)
on conflict (slug) do update set
  label = excluded.label,
  subtitle = excluded.subtitle,
  icon = excluded.icon,
  color = excluded.color,
  image = excluded.image,
  subcategories = excluded.subcategories,
  category_group = excluded.category_group,
  sort_order = excluded.sort_order,
  updated_at = now();