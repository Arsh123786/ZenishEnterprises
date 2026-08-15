-- Zenish Enterprises - Supabase Products Table Setup
-- Run this in: https://supabase.com/dashboard/project/ujuldmcyxwmezfgjxhcy/sql/new

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id text primary key,
  name text not null default '',
  short_description text default '',
  description text default '',
  category_id text default '',
  price numeric default 0,
  mrp numeric default 0,
  stock integer default 0,
  sku text default '',
  material text default '',
  dimensions text default '',
  weight text default '',
  specs text default '',
  custom_specifications text default '',
  amazon_url text default '',
  flipkart_url text default '',
  featured boolean default false,
  new_arrival boolean default false,
  bestseller boolean default false,
  offer boolean default false,
  status text default 'active',
  primary_image text default '',
  images jsonb default '[]'::jsonb,
  video text default '',
  variations jsonb default '[]'::jsonb,
  seo_title text default '',
  seo_description text default '',
  keywords text default '',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.products enable row level security;

create policy "Anyone can read products"
on public.products
for select
using (true);

create policy "Authenticated sellers can insert products"
on public.products
for insert
with check (auth.role() = 'authenticated');

create policy "Authenticated sellers can update products"
on public.products
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Authenticated sellers can delete products"
on public.products
for delete
using (auth.role() = 'authenticated');
