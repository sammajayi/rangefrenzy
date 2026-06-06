-- Since Privy handles auth (not Supabase Auth), the anon key needs access
create policy "Allow anon select" on public.profiles
  for select using (true);

create policy "Allow anon insert" on public.profiles
  for insert with check (true);

create policy "Allow anon update" on public.profiles
  for update using (true);

-- Only needed if RLS was previously enabled without policies:
alter table public.profiles enable row level security;
