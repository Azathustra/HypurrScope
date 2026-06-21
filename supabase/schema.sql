create extension if not exists "pgcrypto";

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  locale text not null default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text not null default 'free' check (plan in ('free', 'member', 'pro', 'desk')),
  status text not null default 'incomplete' check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  category text,
  tags text[] default '{}',
  assets text[] default '{}',
  required_plan text not null default 'free' check (required_plan in ('free', 'member', 'pro', 'desk')),
  conviction text check (conviction in ('low', 'medium', 'high')),
  risk_level text check (risk_level in ('low', 'medium', 'high', 'extreme')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  source_url text,
  source_label text,
  data_timestamp timestamptz,
  author_id uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  conviction integer check (conviction between 0 and 100),
  risk_level text check (risk_level in ('low', 'medium', 'high', 'extreme')),
  required_plan text not null default 'member' check (required_plan in ('free', 'member', 'pro', 'desk')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  source_url text,
  source_label text,
  data_timestamp timestamptz,
  author_id uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  initial_value numeric,
  current_value numeric,
  btc_benchmark_value numeric,
  risk_score integer check (risk_score between 0 and 100),
  required_plan text not null default 'member' check (required_plan in ('free', 'member', 'pro', 'desk')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_allocations (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  asset_name text not null,
  ticker text not null,
  asset_type text not null check (asset_type in ('crypto', 'tradfi', 'cash')),
  weight numeric not null,
  value numeric,
  performance numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  asset_name text,
  ticker text,
  action text check (action in ('buy', 'sell', 'rebalance', 'add_cash', 'remove_cash')),
  quantity numeric,
  price numeric,
  value numeric,
  note text,
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_performance_points (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  date date not null,
  portfolio_value numeric not null,
  btc_benchmark_value numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  required_plan text not null default 'member' check (required_plan in ('free', 'member', 'pro', 'desk')),
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_memberships (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  body text,
  required_plan text not null default 'member' check (required_plan in ('free', 'member', 'pro', 'desk')),
  status text not null default 'published' check (status in ('draft', 'published', 'hidden')),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  check ((post_id is not null and comment_id is null) or (post_id is null and comment_id is not null))
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  visibility text not null default 'private' check (visibility in ('private', 'team', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  symbol text not null,
  asset_name text,
  asset_type text check (asset_type in ('crypto', 'tradfi', 'treasury')),
  thesis text,
  alert_level numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  condition text not null,
  threshold numeric,
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'telegram')),
  status text not null default 'active' check (status in ('active', 'paused', 'triggered', 'deleted')),
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.formation_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  level text,
  required_plan text not null default 'member' check (required_plan in ('free', 'member', 'pro', 'desk')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.formation_lessons (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.formation_tracks(id) on delete cascade,
  title text not null,
  body text,
  video_url text,
  position integer not null default 0,
  duration_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.formation_lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lesson_id, user_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  file_url text,
  content text,
  required_plan text not null default 'member' check (required_plan in ('free', 'member', 'pro', 'desk')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.research_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  stripe_invoice_id text unique,
  amount_due integer,
  amount_paid integer,
  currency text,
  status text,
  hosted_invoice_url text,
  created_at timestamptz not null default now()
);

create or replace function public.plan_rank(plan_name text)
returns integer
language sql
immutable
as $$
  select case plan_name
    when 'desk' then 3
    when 'pro' then 2
    when 'member' then 1
    else 0
  end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.viewer_plan_rank()
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(max(public.plan_rank(plan)), 0)
  from public.subscriptions
  where user_id = auth.uid()
    and status in ('active', 'trialing');
$$;

create or replace function public.can_read_plan(required_plan text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select required_plan = 'free'
    or public.viewer_plan_rank() >= public.plan_rank(required_plan)
    or public.is_admin();
$$;

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.research_posts enable row level security;
alter table public.alpha_signals enable row level security;
alter table public.portfolios enable row level security;
alter table public.portfolio_allocations enable row level security;
alter table public.portfolio_transactions enable row level security;
alter table public.portfolio_performance_points enable row level security;
alter table public.rooms enable row level security;
alter table public.room_memberships enable row level security;
alter table public.community_posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.formation_tracks enable row level security;
alter table public.formation_lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.reports enable row level security;
alter table public.bookmarks enable row level security;
alter table public.audit_logs enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "Profiles readable" on public.profiles;
create policy "Profiles readable" on public.profiles for select using (auth.uid() is not null or public.is_admin());
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users read own subscription" on public.subscriptions;
create policy "Users read own subscription" on public.subscriptions for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Admins manage subscriptions" on public.subscriptions;
create policy "Admins manage subscriptions" on public.subscriptions for all using (public.is_admin());

drop policy if exists "Published research readable by plan" on public.research_posts;
create policy "Published research readable by plan" on public.research_posts for select using (status = 'published' and public.can_read_plan(required_plan));
drop policy if exists "Admins manage research" on public.research_posts;
create policy "Admins manage research" on public.research_posts for all using (public.is_admin());

drop policy if exists "Published signals readable by plan" on public.alpha_signals;
create policy "Published signals readable by plan" on public.alpha_signals for select using (status = 'published' and public.can_read_plan(required_plan));
drop policy if exists "Admins manage signals" on public.alpha_signals;
create policy "Admins manage signals" on public.alpha_signals for all using (public.is_admin());

drop policy if exists "Published portfolios readable by plan" on public.portfolios;
create policy "Published portfolios readable by plan" on public.portfolios for select using (status = 'published' and public.can_read_plan(required_plan));
drop policy if exists "Admins manage portfolios" on public.portfolios;
create policy "Admins manage portfolios" on public.portfolios for all using (public.is_admin());
drop policy if exists "Allocations readable with portfolio" on public.portfolio_allocations;
create policy "Allocations readable with portfolio" on public.portfolio_allocations for select using (
  exists(select 1 from public.portfolios p where p.id = portfolio_id and p.status = 'published' and public.can_read_plan(p.required_plan))
);
drop policy if exists "Transactions readable with portfolio" on public.portfolio_transactions;
create policy "Transactions readable with portfolio" on public.portfolio_transactions for select using (
  exists(select 1 from public.portfolios p where p.id = portfolio_id and p.status = 'published' and public.can_read_plan(p.required_plan))
);
drop policy if exists "Performance readable with portfolio" on public.portfolio_performance_points;
create policy "Performance readable with portfolio" on public.portfolio_performance_points for select using (
  exists(select 1 from public.portfolios p where p.id = portfolio_id and p.status = 'published' and public.can_read_plan(p.required_plan))
);

drop policy if exists "Rooms readable by plan" on public.rooms;
create policy "Rooms readable by plan" on public.rooms for select using ((not is_private) or public.can_read_plan(required_plan));
drop policy if exists "Admins manage rooms" on public.rooms;
create policy "Admins manage rooms" on public.rooms for all using (public.is_admin());

drop policy if exists "Users manage own room membership" on public.room_memberships;
create policy "Users manage own room membership" on public.room_memberships for all using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Community posts readable by plan" on public.community_posts;
create policy "Community posts readable by plan" on public.community_posts for select using (status = 'published' and public.can_read_plan(required_plan));
drop policy if exists "Members create community posts" on public.community_posts;
create policy "Members create community posts" on public.community_posts for insert with check (auth.uid() = author_id and public.viewer_plan_rank() >= 1);
drop policy if exists "Authors update own community posts" on public.community_posts;
create policy "Authors update own community posts" on public.community_posts for update using (auth.uid() = author_id or public.is_admin());

drop policy if exists "Comments readable with post" on public.comments;
create policy "Comments readable with post" on public.comments for select using (
  exists(select 1 from public.community_posts p where p.id = post_id and p.status = 'published' and public.can_read_plan(p.required_plan))
);
drop policy if exists "Members create comments" on public.comments;
create policy "Members create comments" on public.comments for insert with check (auth.uid() = author_id and public.viewer_plan_rank() >= 1);
drop policy if exists "Authors update comments" on public.comments;
create policy "Authors update comments" on public.comments for update using (auth.uid() = author_id or public.is_admin());

drop policy if exists "Users manage reactions" on public.reactions;
create policy "Users manage reactions" on public.reactions for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Watchlists readable" on public.watchlists;
create policy "Watchlists readable" on public.watchlists for select using (visibility = 'public' or auth.uid() = user_id or public.is_admin());
drop policy if exists "Users manage own watchlists" on public.watchlists;
create policy "Users manage own watchlists" on public.watchlists for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
drop policy if exists "Watchlist items readable" on public.watchlist_items;
create policy "Watchlist items readable" on public.watchlist_items for select using (
  exists(select 1 from public.watchlists w where w.id = watchlist_id and (w.visibility = 'public' or w.user_id = auth.uid() or public.is_admin()))
);

drop policy if exists "Users manage own alerts" on public.alerts;
create policy "Users manage own alerts" on public.alerts for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Formation tracks readable by plan" on public.formation_tracks;
create policy "Formation tracks readable by plan" on public.formation_tracks for select using (status = 'published' and public.can_read_plan(required_plan));
drop policy if exists "Formation lessons readable by track" on public.formation_lessons;
create policy "Formation lessons readable by track" on public.formation_lessons for select using (
  exists(select 1 from public.formation_tracks t where t.id = track_id and t.status = 'published' and public.can_read_plan(t.required_plan))
);
drop policy if exists "Users manage own progress" on public.lesson_progress;
create policy "Users manage own progress" on public.lesson_progress for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Reports readable by plan" on public.reports;
create policy "Reports readable by plan" on public.reports for select using (status = 'published' and public.can_read_plan(required_plan));
drop policy if exists "Users manage own bookmarks" on public.bookmarks;
create policy "Users manage own bookmarks" on public.bookmarks for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins read audit logs" on public.audit_logs;
create policy "Admins read audit logs" on public.audit_logs for select using (public.is_admin());
drop policy if exists "Admins read invoices" on public.invoices;
create policy "Admins read invoices" on public.invoices for select using (public.is_admin() or auth.uid() = user_id);

create index if not exists research_posts_slug_idx on public.research_posts(slug);
create index if not exists research_posts_status_plan_idx on public.research_posts(status, required_plan);
create index if not exists subscriptions_user_status_idx on public.subscriptions(user_id, status);
create index if not exists community_posts_room_idx on public.community_posts(room_id, created_at desc);
create index if not exists comments_post_idx on public.comments(post_id, created_at asc);
create index if not exists watchlist_items_watchlist_idx on public.watchlist_items(watchlist_id);
create index if not exists notifications_user_read_idx on public.notifications(user_id, read_at);
