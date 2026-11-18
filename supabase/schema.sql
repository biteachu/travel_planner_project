-- Run in your own Supabase project. No user API keys are stored.
create table if not exists public.trips (
 id text not null,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null,
 data jsonb not null,
 updated_at timestamptz not null default now(),
 primary key (owner_id,id)
);
alter table public.trips enable row level security;
create policy "read own trips" on public.trips for select to authenticated using ((select auth.uid()) = owner_id);
create policy "insert own trips" on public.trips for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "update own trips" on public.trips for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "delete own trips" on public.trips for delete to authenticated using ((select auth.uid()) = owner_id);
