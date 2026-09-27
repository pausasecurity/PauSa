-- Realtime (postgres_changes respektiert die Select-Policies)
alter publication supabase_realtime add table
  public.lobbies,
  public.lobby_members,
  public.lobby_messages,
  public.friendships;

-- Abgelaufene Lobbys alle 5 Minuten löschen (Members + Messages via cascade)
create extension if not exists pg_cron;

select cron.schedule(
  'purge-expired-lobbies',
  '*/5 * * * *',
  $$ select public.purge_expired_lobbies() $$
);
