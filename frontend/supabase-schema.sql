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

create policy "Anyone can read stakes" on public.stakes
  for select using (true);

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
  username       text not null,
  title          text not null,
  body           text,
  read           boolean default false not null,
  created_at     timestamptz default timezone('utc', now()) not null
);

create index if not exists idx_notifications_username
  on public.notifications (username, created_at desc);

-- Allow anon to read their own notifications (username column check)
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

-- ─── 7. Engagement features: profiles extensions ──────────────────────────────
alter table public.profiles
  add column if not exists current_streak   integer default 0 not null,
  add column if not exists last_active_date date,
  add column if not exists referred_by     text;

-- ─── 8. Bonus earnings (unified across all engagement features) ───────────────
create table if not exists public.bonus_earnings (
  id             uuid default gen_random_uuid() primary key,
  wallet_address text not null,
  source         text not null
    check (source in ('first_bet','streak_7','streak_30','referral_bonus','referral_reward','social_twitter','social_telegram')),
  amount_gd      integer not null,
  status         text default 'pending' not null check (status in ('pending','claimed')),
  metadata       jsonb,
  created_at     timestamptz default timezone('utc', now()) not null,
  unique (wallet_address, source)
);

alter table public.bonus_earnings enable row level security;

create policy "Users can read own bonus earnings" on public.bonus_earnings
  for select using (wallet_address = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Service role can write bonus earnings" on public.bonus_earnings
  for all using (true);

-- ─── 9. Referral relationships ──────────────────────────────────────────────
create table if not exists public.referrals (
  id               uuid default gen_random_uuid() primary key,
  referrer_wallet  text not null,
  referee_wallet   text not null unique,
  bonus_credited   boolean default false not null,
  created_at       timestamptz default timezone('utc', now()) not null
);

alter table public.referrals enable row level security;

create policy "Service role only for referrals" on public.referrals
  for all using (false);

-- ─── 10. Helper: make a wallet an admin ──────────────────────────────────────
-- Run manually when needed:
-- update public.profiles set role = 'admin' where wallet_address = '0xYOUR_ADDRESS';

-- ─── 11. Push subscriptions — Web Push (VAPID) endpoints ─────────────────────
-- Keyed by wallet_address (always present) rather than username (may be unset).
create table if not exists public.push_subscriptions (
  id             uuid default gen_random_uuid() primary key,
  wallet_address text not null,
  username       text,
  endpoint       text not null unique,
  p256dh         text not null,
  auth           text not null,
  created_at     timestamptz default timezone('utc', now()) not null
);

create index if not exists idx_push_subscriptions_wallet
  on public.push_subscriptions (wallet_address);

alter table public.push_subscriptions enable row level security;

create policy "Service role only for push subscriptions" on public.push_subscriptions
  for all using (false);

-- ─── 12. Last seen — updated on every successful login (see auth-page.tsx) ────
alter table public.profiles
  add column if not exists last_seen timestamptz;

create index if not exists idx_profiles_last_seen
  on public.profiles (last_seen desc nulls last);
