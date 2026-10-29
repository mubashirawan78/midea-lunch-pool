-- Run once in your Supabase project's SQL Editor.
-- Browser clients receive NO table access; authenticated Next.js routes enforce all access.
create table if not exists public.lunch_pools (
 id uuid primary key,
 owner uuid not null references auth.users(id),
 member_ids uuid[] not null default '{}',
 data jsonb not null,
 revision integer not null default 0 check (revision >= 0),
 created_at timestamptz not null default now(),
 constraint valid_pool_data check (jsonb_typeof(data) = 'object')
);
create index if not exists lunch_pools_owner_idx on public.lunch_pools(owner);
create index if not exists lunch_pools_members_idx on public.lunch_pools using gin(member_ids);
alter table public.lunch_pools enable row level security;
revoke all on table public.lunch_pools from anon, authenticated;
grant select, insert, update on table public.lunch_pools to service_role;
