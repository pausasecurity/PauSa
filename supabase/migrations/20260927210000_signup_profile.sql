-- =============================================================
-- Registrierung übernimmt Onboarding-Daten aus user_metadata
-- (bei E-Mail-Bestätigung gibt es vorher keine Session → Profil muss beim Signup entstehen)
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name  text  := v_meta ->> 'username';
  v_games jsonb := '[]'::jsonb;
  v_links jsonb := '{}'::jsonb;
begin
  if v_name is null
     or v_name !~ '^[A-Za-z0-9_-]{3,30}$'
     or exists (select 1 from public.profiles where username_lower = lower(v_name)) then
    v_name := null;
  end if;

  -- max. 10 Spiele, nur Strings bis 50 Zeichen
  if jsonb_typeof(v_meta -> 'favorite_games') = 'array' then
    select coalesce(jsonb_agg(g), '[]'::jsonb) into v_games
    from (
      select public._clean(value #>> '{}', 50) as g
      from jsonb_array_elements(v_meta -> 'favorite_games')
      where jsonb_typeof(value) = 'string'
      limit 10
    ) s
    where g <> '';
  end if;

  -- nur bekannte Plattformen, Werte bis 30 Zeichen
  if jsonb_typeof(v_meta -> 'social_links') = 'object' then
    select coalesce(jsonb_object_agg(key, public._clean(value #>> '{}', 30)), '{}'::jsonb) into v_links
    from jsonb_each(v_meta -> 'social_links')
    where key in ('steam', 'psn', 'xbox', 'epic', 'nintendo')
      and jsonb_typeof(value) = 'string'
      and public._clean(value #>> '{}', 30) <> '';
  end if;

  insert into public.profiles (id, username, favorite_games) values (new.id, v_name, v_games);
  insert into public.profile_socials (user_id, links) values (new.id, v_links);
  return new;
end
$$;

-- Freundeszahl für beliebige Profile (RLS zeigt nur eigene Freundschaften)
create or replace function public.friend_count(p_user uuid)
returns int
language sql stable security definer
set search_path = ''
as $$
  select count(*)::int from public.friendships
  where status = 'accepted' and (from_id = p_user or to_id = p_user)
$$;

revoke execute on function public.friend_count(uuid) from public, anon;
grant  execute on function public.friend_count(uuid) to authenticated;
