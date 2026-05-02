-- Aegis City — Supabase schema reference
--
-- This is a verbatim derivation of every table / column / RLS / realtime
-- requirement that the application code reads or writes. Run this against
-- your Supabase project (SQL Editor → New query → paste → Run) to bring
-- an existing database in line with what the app expects.
--
-- Idempotent: every statement is `IF NOT EXISTS` / `CREATE OR REPLACE`,
-- so it is safe to re-run.

-- ----------------------------------------------------------------------------
-- 1. realms
--   Code references:
--     SELECT id, name, owner_id, map_data, share_id, only_owner
--     INSERT (owner_id, name, map_data)               -- CreateRealmModal.tsx
--     UPDATE map_data, only_owner, name, share_id
--     Realtime: backend/src/index.ts subscribes to UPDATE + DELETE
-- ----------------------------------------------------------------------------
create table if not exists public.realms (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  owner_id    uuid        not null references auth.users(id) on delete cascade,
  map_data    jsonb,
  share_id    text        not null unique default gen_random_uuid()::text,
  only_owner  boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- If the table pre-existed without these columns / defaults, add / fix them.
alter table public.realms add column if not exists name        text;
alter table public.realms add column if not exists owner_id    uuid references auth.users(id) on delete cascade;
alter table public.realms add column if not exists map_data    jsonb;
alter table public.realms add column if not exists share_id    text;
alter table public.realms add column if not exists only_owner  boolean;
alter table public.realms add column if not exists created_at  timestamptz;

-- Backfill any NULLs that pre-existed before enforcing NOT NULL.
-- share_id may be either uuid or text in pre-existing schemas; cast accordingly.
do $$
declare
  ctype text;
begin
  select data_type into ctype
    from information_schema.columns
    where table_schema = 'public' and table_name = 'realms' and column_name = 'share_id';

  if ctype = 'uuid' then
    execute 'update public.realms set share_id = gen_random_uuid() where share_id is null';
    execute 'alter table public.realms alter column share_id set default gen_random_uuid()';
  else
    execute 'update public.realms set share_id = gen_random_uuid()::text where share_id is null';
    execute 'alter table public.realms alter column share_id set default gen_random_uuid()::text';
  end if;
end $$;

update public.realms set only_owner = false where only_owner is null;
update public.realms set created_at = now() where created_at is null;

alter table public.realms alter column only_owner set default false;
alter table public.realms alter column created_at set default now();

-- Enforce NOT NULL only on columns where every row now has a value.
do $$
begin
  if not exists (select 1 from public.realms where share_id   is null) then alter table public.realms alter column share_id   set not null; end if;
  if not exists (select 1 from public.realms where only_owner is null) then alter table public.realms alter column only_owner set not null; end if;
  if not exists (select 1 from public.realms where created_at is null) then alter table public.realms alter column created_at set not null; end if;
end $$;

-- Unique constraint on share_id (skip if already there).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.realms'::regclass and contype = 'u'
      and conkey = (select array_agg(attnum) from pg_attribute where attrelid = 'public.realms'::regclass and attname = 'share_id')
  ) then
    alter table public.realms add constraint realms_share_id_key unique (share_id);
  end if;
end $$;

create index if not exists realms_owner_id_idx  on public.realms (owner_id);
create index if not exists realms_share_id_idx  on public.realms (share_id);

-- ----------------------------------------------------------------------------
-- 2. profiles
--   Code references:
--     SELECT skin, visited_realms
--     UPDATE skin, visited_realms                     -- SkinMenu, updateVisitedRealms
--   Auto-populated on signup via the trigger defined below.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  skin            text        not null default '009',
  visited_realms  text[]      not null default '{}',
  created_at      timestamptz not null default now()
);

-- If the table pre-existed without these columns / defaults, add / fix them.
alter table public.profiles add column if not exists skin           text;
alter table public.profiles add column if not exists visited_realms text[];
alter table public.profiles add column if not exists created_at     timestamptz;

-- Internal-team rollout: members-only gate. After Google OAuth, employees
-- are held at /welcome until they enter the shared ATHENA_ACCESS_CODE,
-- which flips this to true. RLS policies below check this column.
alter table public.profiles add column if not exists is_member boolean not null default false;

-- Backfill NULLs from a pre-existing schema before enforcing NOT NULL.
update public.profiles set skin           = '009' where skin           is null;
update public.profiles set visited_realms = '{}'      where visited_realms is null;
update public.profiles set created_at     = now()     where created_at     is null;

-- One-shot fix: an earlier version of this script set skin to the literal
-- string 'default', but the Pixi loader resolves /sprites/characters/Character_${skin}.png
-- and there is no Character_default.png. Valid skins are '001'..'083'.
update public.profiles set skin = '009' where skin = 'default';

alter table public.profiles alter column skin           set default '009';
alter table public.profiles alter column visited_realms set default '{}';
alter table public.profiles alter column created_at     set default now();

do $$
begin
  if not exists (select 1 from public.profiles where skin           is null) then alter table public.profiles alter column skin           set not null; end if;
  if not exists (select 1 from public.profiles where visited_realms is null) then alter table public.profiles alter column visited_realms set not null; end if;
  if not exists (select 1 from public.profiles where created_at     is null) then alter table public.profiles alter column created_at     set not null; end if;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Auto-create a profiles row whenever a new auth user is created.
--   Without this, the very first /play visit will fail at:
--     supabase.from('profiles').select('skin').eq('id', user.id).single()
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any existing auth users (no-op if already present).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 4. Row Level Security
--   Frontend uses the anon key for SELECT/INSERT/UPDATE; backend uses the
--   service_role key (which bypasses RLS) for the realtime subscription
--   and authoritative writes.
-- ----------------------------------------------------------------------------
alter table public.realms   enable row level security;
alter table public.profiles enable row level security;

-- realms: members-only access to the single shared office realm.
-- Employees can only SELECT realms if they are flagged is_member=true on
-- their profile. INSERT is removed entirely — no employee can create new
-- realms; only an admin via the service_role key (which bypasses RLS) can.
drop policy if exists "realms readable by anyone signed in"  on public.realms;
drop policy if exists "shared realm readable by members"     on public.realms;
create policy "shared realm readable by members"
  on public.realms for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_member = true
    )
  );

drop policy if exists "owner can insert realms" on public.realms;
-- (no INSERT policy → RLS denies inserts from authenticated users)

drop policy if exists "owner can update own realms" on public.realms;
create policy "owner can update own realms"
  on public.realms for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "owner can delete own realms" on public.realms;
create policy "owner can delete own realms"
  on public.realms for delete
  to authenticated
  using (owner_id = auth.uid());

-- profiles: each user can read + update their own row.
drop policy if exists "profiles readable by self" on public.profiles;
create policy "profiles readable by self"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles updatable by self" on public.profiles;
create policy "profiles updatable by self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5. Realtime publication
--   backend/src/index.ts:51-55 subscribes to postgres_changes on the realms
--   table (UPDATE + DELETE). The realms table must be a member of the
--   supabase_realtime publication for those events to fire.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'realms'
  ) then
    execute 'alter publication supabase_realtime add table public.realms';
  end if;
end $$;
