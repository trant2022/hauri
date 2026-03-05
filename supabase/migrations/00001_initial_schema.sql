-- Initial schema for Unlockt
-- Creates users, files, links, transactions, and payouts tables

-- Users table (public schema, linked to auth.users)
create table public.users (
  id uuid not null references auth.users on delete cascade,
  email text not null,
  username text not null unique,
  stripe_account_id text,
  stripe_customer_id text,
  kyc_verified boolean default false,
  created_at timestamptz default now(),
  primary key (id)
);

alter table public.users enable row level security;

-- RLS policies for users
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Trigger: auto-create public.users row on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'username'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Files table
create table public.files (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users on delete cascade,
  name text not null,
  size_bytes bigint not null,
  mime_type text not null,
  storage_path text not null,
  created_at timestamptz default now()
);

alter table public.files enable row level security;

-- Links table
create table public.links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users on delete cascade,
  file_id uuid not null references public.files on delete cascade,
  slug text not null unique,
  title text not null,
  description text,
  preview_url text,
  price_amount integer not null,
  price_currency text not null default 'CHF',
  max_unlocks integer,
  unlock_count integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.links enable row level security;

-- Transactions table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  link_id uuid not null references public.links on delete cascade,
  buyer_email text not null,
  amount_paid integer not null,
  platform_fee integer not null,
  creator_amount integer not null,
  currency text not null,
  stripe_session_id text unique,
  status text not null default 'completed',
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

-- Payouts table
create table public.payouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users on delete cascade,
  amount integer not null,
  currency text not null,
  stripe_payout_id text unique,
  status text not null default 'pending',
  created_at timestamptz default now()
);

alter table public.payouts enable row level security;
