-- ─────────────────────────────────────────────────────────────────────────────
-- RangeFrenzy — Run this in the Supabase SQL editor
-- Safe to run multiple times (all statements are idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ─── 1. Extend existing profiles table ───────────────────────────────────────
-- profiles is created by the auth flow (wallet_address PK, username, email…)
-- We add GoodDollar verification, onboarding flag, and role here.

alter table public.profiles
  add column if not exists is_whitelisted_gd   boolean default false not null,
  add column if not exists has_seen_onboarding  boolean default false not null,
  add column if not exists role                 text    default 'user' not null
    check (role in ('user', 'admin'));

-- ─── 2. Extend markets table ──────────────────────────────────────────────────
alter table public.markets
  add column if not exists contract_address text,         -- on-chain proxy address
  add column if not exists is_resolved      boolean default false not null,
  add column if not exists winning_outcome  text;

-- ─── 3. Stakes table — records every on-chain bet ────────────────────────────
create table if not exists public.stakes (
  id             uuid default gen_random_uuid() primary key,
  wallet_address text not null,
  market_id      uuid references public.markets(id) on delete cascade not null,
  range_index    integer not null,
  range_label    text not null,
  amount_gd      text not null,          -- formatted G$ (18-decimal string)
  tx_hash        text not null,
  status         text default 'open' not null
    check (status in ('open', 'won', 'lost', 'refunded')),
  payout_gd      text,
  created_at     timestamptz default timezone('utc', now()) not null
);

alter table public.stakes enable row level security;

create policy "Users can read their own stakes" on public.stakes
  for select using (wallet_address = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Service role can write stakes" on public.stakes
  for all using (true);   -- API route uses service role key

-- ─── 4. Social rewards table ─────────────────────────────────────────────────
create table if not exists public.social_rewards (
  id             uuid default gen_random_uuid() primary key,
  wallet_address text not null,
  platform       text not null check (platform in ('twitter', 'telegram')),
  reward_amount  integer default 500 not null,
  status         text default 'pending' not null check (status in ('pending', 'distributed')),
  created_at     timestamptz default timezone('utc', now()) not null,
  unique (wallet_address, platform)
);

alter table public.social_rewards enable row level security;

create policy "Service role only for social rewards" on public.social_rewards
  for all using (false);

-- ─── 5. Notifications table ──────────────────────────────────────────────────
create table if not exists public.notifications (
  id             bigint generated always as identity primary key,
  wallet_address text not null,
  title          text not null,
  body           text,
  read           boolean default false not null,
  created_at     timestamptz default timezone('utc', now()) not null
);

create index if not exists idx_notifications_wallet
  on public.notifications (wallet_address, created_at desc);

-- Allow anon to read their own notifications (wallet_address column check)
alter table public.notifications enable row level security;

create policy "Users can read own notifications" on public.notifications
  for select using (true);

create policy "Users can update own notifications" on public.notifications
  for update using (true);

create policy "Service role can insert notifications" on public.notifications
  for insert with check (true);

-- ─── 6. Storage buckets ───────────────────────────────────────────────────────
-- Create via Supabase dashboard → Storage, or uncomment if your role allows:
-- insert into storage.buckets (id, name, public)
--   values ('market-images', 'market-images', true)
--   on conflict (id) do nothing;

-- ─── 7. Helper: make a wallet an admin ───────────────────────────────────────
-- Run manually when needed:
-- update public.profiles set role = 'admin' where wallet_address = '0xYOUR_ADDRESS';
