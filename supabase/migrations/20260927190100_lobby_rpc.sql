-- =============================================================
-- Lobby-Logik serverseitig (Row-Locks statt Read-then-Write)
-- Lobby-Hopping: 60s Leave-Lock nach Beitritt, 45s Join-Cooldown nach Verlassen
-- =============================================================

create or replace function public._require_uid()
returns uuid
language plpgsql stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Nicht eingeloggt.' using errcode = '28000';
  end if;
  return v_uid;
end
$$;

create or replace function public._secs_label(p_secs int)
returns text
language sql immutable
set search_path = ''
as $$
  select p_secs || ' Sekunde' || case when p_secs <> 1 then 'n' else '' end
$$;

create or replace function public._random_join_code()
returns text
language sql volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 4)
$$;

create or replace function public.purge_expired_lobbies()
returns void
language sql security definer
set search_path = ''
as $$
  delete from public.lobbies where expires_at <= now()
$$;

-- Prüft aktive Mitgliedschaft; abgelaufene Lobbys zählen nicht
-- (Purge allein reicht nicht: wirft die RPC danach eine Exception, wird er zurückgerollt)
create or replace function public._in_active_lobby(p_uid uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.lobby_members m
    join public.lobbies l on l.id = m.lobby_id
    where m.user_id = p_uid and l.expires_at > now()
  )
$$;

-- ---------- create ----------
create or replace function public.create_lobby(
  p_game text, p_game_category text, p_title text, p_description text,
  p_max_slots int, p_requires_mic boolean, p_language text, p_min_rank text,
  p_platform text, p_region text, p_mode text, p_gender text, p_min_age int
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_uid();
  v_id  uuid;
  v_try int := 0;
begin
  perform public.purge_expired_lobbies();

  if public._in_active_lobby(v_uid) then
    raise exception 'Du bist bereits in einer anderen Lobby.';
  end if;

  loop
    v_try := v_try + 1;
    begin
      insert into public.lobbies (
        host_id, game, game_category, title, description, max_slots, requires_mic,
        language, min_rank, platform, region, mode, gender, min_age, join_code
      ) values (
        v_uid,
        public._clean(p_game, 50),
        coalesce(nullif(public._clean(p_game_category, 30), ''), 'other'),
        public._clean(p_title, 80),
        public._clean(p_description, 200),
        least(greatest(coalesce(p_max_slots, 5), 2), 10),
        coalesce(p_requires_mic, false),
        coalesce(nullif(p_language, ''), 'de'),
        nullif(nullif(p_min_rank, ''), 'Keine'),
        coalesce(p_platform, 'crossplay'),
        coalesce(p_region, 'eu'),
        coalesce(p_mode, 'casual'),
        coalesce(p_gender, 'any'),
        coalesce(p_min_age, 0),
        public._random_join_code()
      )
      returning id into v_id;
      exit;
    exception when unique_violation then
      if v_try >= 10 then raise; end if;
    end;
  end loop;

  insert into public.lobby_members (lobby_id, user_id) values (v_id, v_uid);
  return v_id;
end
$$;

-- ---------- join ----------
create or replace function public.join_lobby(p_lobby uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := public._require_uid();
  v_lobby public.lobbies;
  v_count int;
  v_left  timestamptz;
  v_wait  int;
begin
  perform public.purge_expired_lobbies();

  select * into v_lobby from public.lobbies where id = p_lobby for update;
  if not found then
    raise exception 'Lobby nicht gefunden.';
  end if;

  select count(*) into v_count from public.lobby_members where lobby_id = p_lobby;
  if v_count >= v_lobby.max_slots then
    raise exception 'Lobby ist voll.';
  end if;

  if exists (select 1 from public.lobby_members where lobby_id = p_lobby and user_id = v_uid) then
    raise exception 'Bereits in dieser Lobby.';
  end if;

  if public._in_active_lobby(v_uid) then
    raise exception 'Du bist bereits in einer anderen Lobby.';
  end if;

  select left_lobby_at into v_left from public.profiles where id = v_uid;
  if v_left is not null then
    v_wait := ceil(45 - extract(epoch from (now() - v_left)));
    if v_wait > 0 then
      raise exception 'Bitte warte noch %, bevor du eine neue Lobby betrittst.', public._secs_label(v_wait);
    end if;
  end if;

  insert into public.lobby_members (lobby_id, user_id) values (p_lobby, v_uid);
  update public.lobbies set all_ready_at = null where id = p_lobby and all_ready_at is not null;
end
$$;

-- ---------- leave ----------
create or replace function public.leave_lobby(p_lobby uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid    uuid := public._require_uid();
  v_lobby  public.lobbies;
  v_joined timestamptz;
  v_wait   int;
begin
  select * into v_lobby from public.lobbies where id = p_lobby for update;
  if not found then return; end if;

  select joined_at into v_joined from public.lobby_members where lobby_id = p_lobby and user_id = v_uid;
  if not found then return; end if;

  v_wait := ceil(60 - extract(epoch from (now() - v_joined)));
  if v_wait > 0 then
    raise exception 'Noch % – du kannst die Lobby erst nach 1 Minute verlassen.', public._secs_label(v_wait);
  end if;

  delete from public.lobby_members where lobby_id = p_lobby and user_id = v_uid;
  update public.profiles set left_lobby_at = now() where id = v_uid;

  if not exists (select 1 from public.lobby_members where lobby_id = p_lobby) then
    delete from public.lobbies where id = p_lobby;
  elsif v_lobby.host_id = v_uid then
    update public.lobbies
       set host_id = (select user_id from public.lobby_members
                      where lobby_id = p_lobby order by joined_at, user_id limit 1)
     where id = p_lobby;
  end if;
end
$$;

-- ---------- kick ----------
create or replace function public.kick_member(p_lobby uuid, p_user uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := public._require_uid();
  v_lobby public.lobbies;
begin
  select * into v_lobby from public.lobbies where id = p_lobby for update;
  if not found then return; end if;
  if v_lobby.host_id <> v_uid then
    raise exception 'Nur der Host kann Spieler kicken.';
  end if;
  if p_user = v_uid then
    raise exception 'Du kannst dich nicht selbst kicken.';
  end if;

  delete from public.lobby_members where lobby_id = p_lobby and user_id = p_user;

  if v_lobby.all_ready_at is not null
     and exists (select 1 from public.lobby_members where lobby_id = p_lobby and not is_ready) then
    update public.lobbies set all_ready_at = null where id = p_lobby;
  end if;
end
$$;

-- ---------- ready ----------
create or replace function public.set_ready(p_lobby uuid, p_ready boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := public._require_uid();
  v_lobby public.lobbies;
  v_count int;
  v_all   boolean;
begin
  select * into v_lobby from public.lobbies where id = p_lobby for update;
  if not found then return; end if;

  if not exists (select 1 from public.lobby_members where lobby_id = p_lobby and user_id = v_uid) then
    raise exception 'Du bist nicht in dieser Lobby.';
  end if;

  -- Kein un-ready mehr sobald der Game-Timer gestartet ist
  if not p_ready and v_lobby.all_ready_at is not null then return; end if;

  update public.lobby_members set is_ready = p_ready where lobby_id = p_lobby and user_id = v_uid;

  select count(*), bool_and(is_ready) into v_count, v_all
    from public.lobby_members where lobby_id = p_lobby;
  v_all := v_count >= 2 and coalesce(v_all, false);

  if v_all and v_lobby.all_ready_at is null then
    update public.lobbies set all_ready_at = now() where id = p_lobby;
  elsif not v_all and v_lobby.all_ready_at is not null then
    update public.lobbies set all_ready_at = null where id = p_lobby;
  end if;
end
$$;

-- ---------- dissolve ----------
create or replace function public.dissolve_lobby(p_lobby uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public._require_uid();
  v_host uuid;
begin
  select host_id into v_host from public.lobbies where id = p_lobby for update;
  if not found then return; end if;
  if v_host <> v_uid then
    raise exception 'Nur der Host kann die Lobby auflösen.';
  end if;
  delete from public.lobbies where id = p_lobby;
end
$$;

-- ---------- Account ----------
create or replace function public.delete_own_account()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = public._require_uid();
end
$$;

-- Vor der Registrierung aufrufbar (anon)
create or replace function public.username_available(p_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select p_name ~ '^[A-Za-z0-9_-]{3,30}$'
     and not exists (select 1 from public.profiles where username_lower = lower(p_name))
$$;

-- ---------- Grants ----------
revoke execute on function public._require_uid()            from public, anon, authenticated;
revoke execute on function public._secs_label(int)          from public, anon, authenticated;
revoke execute on function public._random_join_code()       from public, anon, authenticated;
revoke execute on function public.purge_expired_lobbies()   from public, anon, authenticated;
revoke execute on function public._in_active_lobby(uuid)      from public, anon, authenticated;

revoke execute on function public.create_lobby(text, text, text, text, int, boolean, text, text, text, text, text, text, int) from public, anon;
revoke execute on function public.join_lobby(uuid)          from public, anon;
revoke execute on function public.leave_lobby(uuid)         from public, anon;
revoke execute on function public.kick_member(uuid, uuid)   from public, anon;
revoke execute on function public.set_ready(uuid, boolean)  from public, anon;
revoke execute on function public.dissolve_lobby(uuid)      from public, anon;
revoke execute on function public.delete_own_account()      from public, anon;

grant execute on function public.create_lobby(text, text, text, text, int, boolean, text, text, text, text, text, text, int) to authenticated;
grant execute on function public.join_lobby(uuid)           to authenticated;
grant execute on function public.leave_lobby(uuid)          to authenticated;
grant execute on function public.kick_member(uuid, uuid)    to authenticated;
grant execute on function public.set_ready(uuid, boolean)   to authenticated;
grant execute on function public.dissolve_lobby(uuid)       to authenticated;
grant execute on function public.delete_own_account()       to authenticated;
grant execute on function public.username_available(text)   to anon, authenticated;
