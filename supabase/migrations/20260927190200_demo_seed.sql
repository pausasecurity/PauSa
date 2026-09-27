-- =============================================================
-- Demo-Daten für die Aufbauphase (Mock-Spieler u1–u12 aus src/data/mockPlayers.js)
-- Entfernen vor Launch: delete from public.profiles where is_demo;
-- =============================================================

insert into public.profiles (id, username, favorite_games, is_demo)
select format('00000000-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid, name, games, true
from (values
  (1,  'NeonBlade_X',    '["Valorant","League of Legends","Teamfight Tactics"]'::jsonb),
  (2,  'ShadowWolf_99',  '["Counter-Strike 2","Valorant","Escape from Tarkov"]'::jsonb),
  (3,  'StarDust_Ria',   '["World of Warcraft","Final Fantasy XIV","Destiny 2"]'::jsonb),
  (4,  'IronForge77',    '["Counter-Strike 2","Rust","DayZ"]'::jsonb),
  (5,  'PixelQueen',     '["Fortnite","Apex Legends","Rocket League"]'::jsonb),
  (6,  'GrimReaper_K',   '["League of Legends","Teamfight Tactics","DOTA 2"]'::jsonb),
  (7,  'LunaticFringe',  '["Minecraft","Valheim","No Man''s Sky"]'::jsonb),
  (8,  'VortexStrike',   '["Valorant","Apex Legends","Counter-Strike 2"]'::jsonb),
  (9,  'ThunderPunch',   '["Tekken 8","Street Fighter 6","Mortal Kombat 1"]'::jsonb),
  (10, 'ArcaneWitch',    '["Path of Exile","Diablo IV","World of Warcraft"]'::jsonb),
  (11, 'Ghost_Protocol', '["Call of Duty: Warzone","Escape from Tarkov","Ghost Recon"]'::jsonb),
  (12, 'CrystalShard',   '["Final Fantasy XIV","Guild Wars 2","Lost Ark"]'::jsonb)
) as t(n, name, games)
on conflict (id) do nothing;

create or replace function public._demo_id(n int)
returns uuid
language sql immutable
set search_path = ''
as $$
  select format('00000000-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid
$$;

-- Legt die 3 Demo-Lobbys an, wenn keine einzige Lobby existiert (ersetzt seedIfEmpty)
create or replace function public.seed_demo_lobbies()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public._require_uid();
  perform public.purge_expired_lobbies();
  perform pg_advisory_xact_lock(hashtext('seed_demo_lobbies'));
  if exists (select 1 from public.lobbies) then return; end if;

  insert into public.lobbies (host_id, game, game_category, title, description, max_slots, requires_mic, language, min_rank, join_code, created_at)
  values (public._demo_id(4), 'Valorant', 'shooter', 'Suche 2 für Ranked – Platin+',
          'Chill, kein Flame. Mic Pflicht. EU-West.', 5, true, 'de', 'Platin',
          public._random_join_code(), now() - interval '5 minutes')
  returning id into v_id;
  insert into public.lobby_members (lobby_id, user_id, is_ready, joined_at) values
    (v_id, public._demo_id(4), true,  'epoch'),
    (v_id, public._demo_id(8), false, 'epoch'),
    (v_id, public._demo_id(6), true,  'epoch');

  insert into public.lobbies (host_id, game, game_category, title, description, max_slots, requires_mic, language, min_rank, join_code, created_at)
  values (public._demo_id(5), 'Apex Legends', 'battle-royale', 'Duo für Ranked – Diamond Push',
          'Pred-Player sucht Duo. Voice im Discord. Kein Whining.', 3, true, 'en', 'Diamant',
          public._random_join_code(), now() - interval '10 minutes')
  returning id into v_id;
  insert into public.lobby_members (lobby_id, user_id, is_ready, joined_at) values
    (v_id, public._demo_id(5), true, 'epoch');

  insert into public.lobbies (host_id, game, game_category, title, description, max_slots, requires_mic, language, min_rank, join_code, created_at)
  values (public._demo_id(1), 'League of Legends', 'moba', 'Clash-Team sucht Support & Jungle',
          'Gold+ bitte. Wir sind chill aber wollen gewinnen.', 5, false, 'de', 'Gold',
          public._random_join_code(), now() - interval '15 minutes')
  returning id into v_id;
  insert into public.lobby_members (lobby_id, user_id, is_ready, joined_at) values
    (v_id, public._demo_id(1), true,  'epoch'),
    (v_id, public._demo_id(3), true,  'epoch'),
    (v_id, public._demo_id(9), false, 'epoch');
end
$$;

revoke execute on function public._demo_id(int)          from public, anon, authenticated;
revoke execute on function public.seed_demo_lobbies()    from public, anon;
grant  execute on function public.seed_demo_lobbies()    to authenticated;
