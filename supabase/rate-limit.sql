-- Apply in the same Supabase project. Only the server service_role can call these functions.
-- Stores a SHA-256 fingerprint, never a user's API key or travel input.
create table if not exists public.agent_limits (
 key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
 window_start timestamptz not null,
 requests integer not null default 0,
 lease_id uuid,
 lease_until timestamptz
);
create index if not exists agent_limits_window on public.agent_limits(window_start);
alter table public.agent_limits enable row level security;
revoke all on public.agent_limits from public, anon, authenticated;

create or replace function public.acquire_agent_permit(p_key_hash text, p_lease_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
 entry public.agent_limits%rowtype;
 stamp timestamptz := clock_timestamp();
begin
 if p_key_hash is null or p_key_hash !~ '^[a-f0-9]{64}$' or p_lease_id is null then
   raise exception 'Invalid permit';
 end if;
 delete from public.agent_limits where window_start < stamp - interval '1 day'
   and (lease_until is null or lease_until < stamp);
 insert into public.agent_limits(key_hash, window_start) values (p_key_hash, stamp)
   on conflict (key_hash) do update set key_hash = excluded.key_hash
   returning * into entry;
 if entry.lease_until > stamp then return false; end if;
 if entry.window_start <= stamp - interval '60 seconds' then
   entry.window_start := stamp;
   entry.requests := 0;
 end if;
 if entry.requests >= 15 then return false; end if;
 update public.agent_limits set window_start = entry.window_start,
   requests = entry.requests + 1, lease_id = p_lease_id,
   lease_until = stamp + interval '300 seconds' where key_hash = p_key_hash;
 return true;
end;
$$;

create or replace function public.release_agent_permit(p_key_hash text, p_lease_id uuid)
returns void language sql security definer set search_path = '' as $$
 update public.agent_limits set lease_id = null, lease_until = null
   where key_hash = p_key_hash and lease_id = p_lease_id;
$$;
revoke all on function public.acquire_agent_permit(text, uuid) from public, anon, authenticated;
revoke all on function public.release_agent_permit(text, uuid) from public, anon, authenticated;
grant execute on function public.acquire_agent_permit(text, uuid) to service_role;
grant execute on function public.release_agent_permit(text, uuid) to service_role;
