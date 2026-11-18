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
drop policy if exists "read own trips" on public.trips;
drop policy if exists "insert own trips" on public.trips;
drop policy if exists "update own trips" on public.trips;
drop policy if exists "delete own trips" on public.trips;
create policy "read own trips" on public.trips for select to authenticated using ((select auth.uid()) = owner_id);
create policy "insert own trips" on public.trips for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "update own trips" on public.trips for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "delete own trips" on public.trips for delete to authenticated using ((select auth.uid()) = owner_id);

-- Every changed account save records a snapshot in the same transaction.
create table if not exists public.trip_revisions (
 id bigint generated always as identity primary key,
 trip_id text not null,
 owner_id uuid not null,
 title text not null,
 data jsonb not null,
 saved_at timestamptz not null default now(),
 foreign key (owner_id, trip_id) references public.trips(owner_id, id) on delete cascade
);
create index if not exists trip_revisions_owner_trip on public.trip_revisions(owner_id, trip_id, saved_at desc);
alter table public.trip_revisions enable row level security;
drop policy if exists "read own revisions" on public.trip_revisions;
create policy "read own revisions" on public.trip_revisions for select to authenticated using ((select auth.uid()) = owner_id);
revoke all on public.trip_revisions from anon, authenticated;
grant select on public.trip_revisions to authenticated;

create or replace function public.capture_trip_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if TG_OP = 'INSERT' or new.data is distinct from old.data or new.title is distinct from old.title then
  insert into public.trip_revisions (trip_id, owner_id, title, data)
  values (new.id, new.owner_id, new.title, new.data);
 end if;
 return new;
end;
$$;
revoke all on function public.capture_trip_revision() from public, anon, authenticated;
drop trigger if exists record_trip_revision on public.trips;
create trigger record_trip_revision after insert or update on public.trips
 for each row execute function public.capture_trip_revision();

-- Preserve the current snapshot when enabling history on an existing project.
insert into public.trip_revisions (trip_id, owner_id, title, data)
select t.id, t.owner_id, t.title, t.data from public.trips t
where not exists (select 1 from public.trip_revisions r where r.owner_id = t.owner_id and r.trip_id = t.id);

-- Initial setup includes explicit client privileges; RLS still scopes each row.
grant select, insert, update, delete on public.trips to authenticated;
revoke all on public.trips from anon;
