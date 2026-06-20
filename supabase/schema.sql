create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text check (plan in ('free', 'member', 'pro', 'desk')),
  status text check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.research_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  category text,
  tags text[],
  assets text[],
  required_plan text default 'free' check (required_plan in ('free', 'member', 'pro', 'desk')),
  conviction text check (conviction in ('low', 'medium', 'high')),
  risk_level text check (risk_level in ('low', 'medium', 'high', 'extreme')),
  status text check (status in ('draft', 'published')),
  published_at timestamptz,
  author_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.alpha_signals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  asset text,
  ticker text,
  thesis text,
  trigger text,
  invalidation text,
  timeframe text,
  conviction integer,
  risk_level text,
  required_plan text,
  status text,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  initial_value numeric,
  current_value numeric,
  risk_score integer,
  required_plan text,
  status text,
  launched_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.portfolio_allocations (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references public.portfolios(id) on delete cascade,
  asset_name text,
  ticker text,
  asset_type text check (asset_type in ('crypto', 'tradfi', 'cash')),
  weight numeric,
  value numeric,
  performance numeric,
  created_at timestamptz default now()
);

create table if not exists public.portfolio_transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references public.portfolios(id) on delete cascade,
  asset_name text,
  ticker text,
  action text check (action in ('buy', 'sell', 'rebalance', 'add_cash', 'remove_cash')),
  quantity numeric,
  price numeric,
  value numeric,
  note text,
  executed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.portfolio_performance_points (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references public.portfolios(id) on delete cascade,
  date date,
  portfolio_value numeric,
  btc_benchmark_value numeric,
  created_at timestamptz default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text,
  slug text unique,
  excerpt text,
  file_url text,
  content text,
  required_plan text,
  status text,
  published_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.research_posts(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.research_posts enable row level security;
alter table public.alpha_signals enable row level security;
alter table public.portfolios enable row level security;
alter table public.portfolio_allocations enable row level security;
alter table public.portfolio_transactions enable row level security;
alter table public.portfolio_performance_points enable row level security;
alter table public.reports enable row level security;
alter table public.bookmarks enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can read own subscription" on public.subscriptions for select using (auth.uid() = user_id or public.is_admin());
create policy "Admins manage subscriptions" on public.subscriptions for all using (public.is_admin());
create policy "Public can read published free posts" on public.research_posts for select using (status = 'published' and required_plan = 'free');
create policy "Admins manage posts" on public.research_posts for all using (public.is_admin());
create policy "Admins manage signals" on public.alpha_signals for all using (public.is_admin());
create policy "Admins manage portfolios" on public.portfolios for all using (public.is_admin());
create policy "Admins manage allocations" on public.portfolio_allocations for all using (public.is_admin());
create policy "Admins manage transactions" on public.portfolio_transactions for all using (public.is_admin());
create policy "Admins manage performance" on public.portfolio_performance_points for all using (public.is_admin());
create policy "Admins manage reports" on public.reports for all using (public.is_admin());
create policy "Users manage own bookmarks" on public.bookmarks for all using (auth.uid() = user_id);
