-- =============================================================
-- PauSa Schema: Tabellen, Constraints, RLS, Grants
-- Grundsatz: anon sieht nichts. Lobby-Mutationen nur über RPC (siehe lobby_rpc).
-- =============================================================

-- ---------- Helper ----------
create or replace function public._clean(p_val text, p_max int)
returns text
language sql immutable
set search_path = ''
as $$
  select left(btrim(regexp_replace(coalesce(p_val, ''), '<[^>]*>', '', 'g')), p_max)
$$;

-- ---------- profiles ----------
-- Kein FK auf auth.users: Demo-Profile (is_demo) existieren ohne Auth-Account.
-- Löschung echter Profile per Trigger auf auth.users.
create table public.profiles (
  id              uuid primary key default gen_random_uuid(),
  username        text,
  username_lower  text generated always as (lower(username)) stored,
  favorite_games  jsonb not null default '[]'::jsonb,
  is_demo         boolean not null default false,
  left_lobby_at   timestamptz,
  created_at      timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[A-Za-z0-9_-]{3,30}$'),
  constraint profiles_favorite_games check (
    jsonb_typeof(favorite_games) = 'array' and pg_column_size(favorite_games) < 4000
  )
);
create unique index profiles_username_lower_key on public.profiles (username_lower);
create index profiles_username_prefix_idx on public.profiles (username_lower text_pattern_ops);

-- Social-IDs getrennt: Sichtbarkeit serverseitig per can_see_socials()
create table public.profile_socials (
  user_id  uuid primary key references public.profiles (id) on delete cascade,
  links    jsonb not null default '{}'::jsonb,
  constraint profile_socials_links check (
    jsonb_typeof(links) = 'object' and pg_column_size(links) < 2000
  )
);

-- ---------- lobbies ----------
create table public.lobbies (
  id             uuid primary key default gen_random_uuid(),
  host_id        uuid not null references public.profiles (id) on delete cascade,
  game           text not null check (char_length(game) between 1 and 50),
  game_category  text not null default 'other' check (char_length(game_category) between 1 and 30),
  title          text not null check (char_length(title) between 1 and 80),
  description    text not null default '' check (char_length(description) <= 200),
  max_slots      int  not null default 5 check (max_slots between 2 and 10),
  requires_mic   boolean not null default false,
  language       text not null default 'de' check (char_length(language) between 2 and 5),
  min_rank       text check (min_rank in ('Bronze', 'Silber', 'Gold', 'Platin', 'Diamant', 'Radiant')),
  platform       text not null default 'crossplay' check (platform in ('crossplay', 'pc', 'ps5', 'xbox', 'switch', 'mobile')),
  region         text not null default 'eu' check (region in ('eu', 'na', 'as', 'sa', 'oc')),
  mode           text not null default 'casual' check (mode in ('casual', 'ranked', 'competitive', 'fun')),
  gender         text not null default 'any' check (gender in ('any', 'mixed', 'male', 'female')),
  min_age        int  not null default 0 check (min_age in (0, 16, 18, 25)),
  join_code      text not null unique check (join_code ~ '^[A-HJ-NP-Z2-9]{4}$'),
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '4 hours',
  all_ready_at   timestamptz
);
create index lobbies_expires_at_idx on public.lobbies (expires_at);

create table public.lobby_members (
  lobby_id   uuid not null references public.lobbies (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  is_ready   boolean not null default false,
  joined_at  timestamptz not null default now(),
  primary key (lobby_id, user_id),
  constraint lobby_members_one_lobby_per_user unique (user_id)
);

create table public.lobby_messages (
  id          bigint generated always as identity primary key,
  lobby_id    uuid not null references public.lobbies (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  username    text not null default '',
  text        text not null check (char_length(text) between 1 and 300),
  created_at  timestamptz not null default now()
);
create index lobby_messages_lobby_created_idx on public.lobby_messages (lobby_id, created_at);

-- ---------- friendships ----------
create table public.friendships (
  id          uuid primary key default gen_random_uuid(),
  from_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_id       uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  constraint friendships_not_self check (from_id <> to_id)
);
create unique index friendships_pair_key on public.friendships (least(from_id, to_id), greatest(from_id, to_id));
create index friendships_to_idx on public.friendships (to_id);

-- ---------- ratings ----------
create table public.ratings (
  id          uuid primary key default gen_random_uuid(),
  lobby_id    uuid not null,
  rater_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_id   uuid not null references public.profiles (id) on delete cascade,
  stars       smallint not null check (stars between 1 and 5),
  comment     text not null default '' check (char_length(comment) <= 500),
  created_at  timestamptz not null default now(),
  constraint ratings_unique unique (lobby_id, rater_id, target_id),
  constraint ratings_not_self check (rater_id <> target_id)
);
create index ratings_target_idx on public.ratings (target_id);

-- ---------- login_history (nur Server) ----------
create table public.login_history (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  ip          text,
  country     text,
  city        text,
  user_agent  text,
  login_at    timestamptz not null default now()
);

-- =============================================================
-- Auth-Trigger
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := new.raw_user_meta_data ->> 'username';
begin
  if v_name is null
     or v_name !~ '^[A-Za-z0-9_-]{3,30}$'
     or exists (select 1 from public.profiles where username_lower = lower(v_name)) then
    v_name := null;
  end if;
  insert into public.profiles (id, username) values (new.id, v_name);
  insert into public.profile_socials (user_id) values (new.id);
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_deleted_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.profiles where id = old.id;
  return old;
end
$$;

create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function public.handle_deleted_user();

-- Chat: Username + Zeitstempel serverseitig setzen
create or replace function public.lobby_messages_before_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.username   := coalesce((select username from public.profiles where id = new.user_id), '');
  new.text       := public._clean(new.text, 300);
  new.created_at := now();
  return new;
end
$$;

create trigger lobby_messages_before_insert
  before insert on public.lobby_messages
  for each row execute function public.lobby_messages_before_insert();

-- =============================================================
-- Policy-Helper (security definer → keine RLS-Rekursion)
-- =============================================================
create or replace function public.is_lobby_member(p_lobby uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lobby_members
    where lobby_id = p_lobby and user_id = auth.uid()
  )
$$;

-- Privacy-Shield: eigenes Profil || Freund || gemeinsame Lobby mit gestartetem Ready-Timer
create or replace function public.can_see_socials(p_target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select p_target = auth.uid()
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.from_id = auth.uid() and f.to_id = p_target)
          or (f.to_id = auth.uid() and f.from_id = p_target))
    )
    or exists (
      select 1
      from public.lobby_members me
      join public.lobby_members other on other.lobby_id = me.lobby_id
      join public.lobbies l on l.id = me.lobby_id
      where me.user_id = auth.uid()
        and other.user_id = p_target
        and l.all_ready_at is not null
    )
$$;

-- =============================================================
-- RLS
-- =============================================================
alter table public.profiles        enable row level security;
alter table public.profile_socials enable row level security;
alter table public.lobbies         enable row level security;
alter table public.lobby_members   enable row level security;
alter table public.lobby_messages  enable row level security;
alter table public.friendships     enable row level security;
alter table public.ratings         enable row level security;
alter table public.login_history   enable row level security;

-- profiles
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- profile_socials
create policy socials_select on public.profile_socials
  for select to authenticated using (public.can_see_socials(user_id));
create policy socials_update_own on public.profile_socials
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- lobbies / members: nur lesen, Schreiben via RPC
create policy lobbies_select on public.lobbies
  for select to authenticated using (expires_at > now());
create policy lobby_members_select on public.lobby_members
  for select to authenticated using (true);

-- lobby_messages: nur Mitglieder lesen/schreiben
create policy messages_select on public.lobby_messages
  for select to authenticated using (public.is_lobby_member(lobby_id));
create policy messages_insert on public.lobby_messages
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_lobby_member(lobby_id));

-- friendships
create policy friendships_select on public.friendships
  for select to authenticated using ((select auth.uid()) in (from_id, to_id));
create policy friendships_insert on public.friendships
  for insert to authenticated with check (from_id = (select auth.uid()) and status = 'pending');
create policy friendships_accept on public.friendships
  for update to authenticated
  using (to_id = (select auth.uid()) and status = 'pending')
  with check (status = 'accepted');
create policy friendships_delete on public.friendships
  for delete to authenticated using ((select auth.uid()) in (from_id, to_id));

-- ratings
create policy ratings_select on public.ratings
  for select to authenticated using (true);
create policy ratings_insert on public.ratings
  for insert to authenticated with check (rater_id = (select auth.uid()));

-- login_history: keine Policies → nur service_role / security definer

-- =============================================================
-- Grants (Spalten-Level zusätzlich zu RLS)
-- =============================================================
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

revoke insert, update, delete on public.profiles        from authenticated;
grant  update (username, favorite_games) on public.profiles to authenticated;

revoke insert, update, delete on public.profile_socials from authenticated;
grant  update (links) on public.profile_socials to authenticated;

revoke insert, update, delete on public.lobbies         from authenticated;
revoke insert, update, delete on public.lobby_members   from authenticated;

revoke update, delete on public.lobby_messages          from authenticated;

revoke update on public.friendships                     from authenticated;
grant  update (status) on public.friendships            to authenticated;

revoke update, delete on public.ratings                 from authenticated;

revoke all on public.login_history                      from authenticated;

revoke execute on function public._clean(text, int)         from public, anon;
revoke execute on function public.handle_new_user()         from public, anon, authenticated;
revoke execute on function public.handle_deleted_user()     from public, anon, authenticated;
revoke execute on function public.lobby_messages_before_insert() from public, anon, authenticated;
revoke execute on function public.is_lobby_member(uuid)     from public, anon;
revoke execute on function public.can_see_socials(uuid)     from public, anon;
grant  execute on function public.is_lobby_member(uuid)     to authenticated;
grant  execute on function public.can_see_socials(uuid)     to authenticated;
