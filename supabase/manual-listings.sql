create extension if not exists pgcrypto;

create table if not exists public.manual_listings (
  id text primary key,
  name text not null,
  price numeric(10, 2) not null default 0,
  image text not null default '',
  images text[] not null default '{}',
  description text not null default '',
  condition text not null default '',
  badge text not null default '',
  set_name text not null default '',
  rarity text not null default '',
  status text not null default 'active' check (status in ('active', 'sold')),
  source_url text not null default '',
  postage_size text not null default '' check (postage_size in ('', 'small', 'medium', 'large')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_manual_listing_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_manual_listings_updated_at on public.manual_listings;
create trigger trg_manual_listings_updated_at
before update on public.manual_listings
for each row
execute function public.set_manual_listing_updated_at();

