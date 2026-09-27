import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

// Führt alle Migrationen in PGlite (Postgres im Prozess) mit Supabase-Stubs aus und prüft RLS + RPCs
const MIG = fileURLToPath(new URL('../migrations', import.meta.url))
const db = new PGlite()
let fails = 0
const ok = (name, cond, extra = '') => { if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`) }

// ---- Supabase-Stubs ----
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  create publication supabase_realtime;
`)

for (const f of readdirSync(MIG).sort()) {
  let sql = readFileSync(`${MIG}/${f}`, 'utf8')
  if (f.includes('realtime_cron')) sql = sql.split('-- Abgelaufene Lobbys')[0]
  try { await db.exec(sql); console.log(`migriert: ${f}`) }
  catch (e) { console.log(`MIGRATION FEHLER ${f}: ${e.message}`); process.exit(1) }
}

// ---- Helpers ----
async function as(uid, sql, params = []) {
  await db.exec(uid ? `set role authenticated` : `set role anon`)
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ''])
  try { return await db.query(sql, params) }
  finally { await db.exec('reset role') }
}
async function err(uid, sql, params = []) {
  try { await as(uid, sql, params); return null } catch (e) { return e.message }
}
const expectErr = async (name, uid, sql, params, re) => {
  const m = await err(uid, sql, params)
  ok(name, m && (!re || re.test(m)), `(${m ?? 'kein Fehler!'})`)
}
const su = (sql, p = []) => db.query(sql, p)
async function newUser(name) {
  const id = randomUUID()
  await su(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id, `${name}@t.local`, { username: name }])
  return id
}

const A = await newUser('Alice'), B = await newUser('Bob'), C = await newUser('Carl')
const D = await newUser('alice')   // Username-Kollision (case-insensitive)

// ---- profiles ----
const pa = (await su(`select * from profiles where id = $1`, [A])).rows[0]
ok('Profil per Trigger angelegt', pa?.username === 'Alice')
ok('Doppelter Username → null', (await su(`select username from profiles where id = $1`, [D])).rows[0].username === null)
await expectErr('Anon liest keine Profile', null, `select * from profiles`, [], /permission denied/)
ok('username_available (anon)', (await as(null, `select username_available('Neuer_1') a, username_available('ALICE') b`)).rows[0].a === true
  && (await as(null, `select username_available('ALICE') b`)).rows[0].b === false)
await as(A, `update profiles set username = 'Alice2' where id = $1`, [A])
ok('Eigenen Username ändern', (await su(`select username from profiles where id = $1`, [A])).rows[0].username === 'Alice2')
const r0 = await as(A, `update profiles set username = 'hacked' where id = $1`, [B])
ok('Fremdes Profil nicht änderbar', r0.affectedRows === 0)
await expectErr('is_demo nicht änderbar', A, `update profiles set is_demo = true where id = $1`, [A], /permission denied/)
await expectErr('left_lobby_at nicht änderbar (Cooldown-Bypass)', A, `update profiles set left_lobby_at = null where id = $1`, [A], /permission denied/)
await expectErr('Ungültiger Username', A, `update profiles set username = '<script>' where id = $1`, [A], /check/)

// ---- socials ----
await as(A, `update profile_socials set links = '{"steam":"alice_steam"}' where user_id = $1`, [A])
ok('Eigene Socials sichtbar', (await as(A, `select * from profile_socials where user_id = $1`, [A])).rows.length === 1)
ok('Fremde Socials verborgen', (await as(B, `select * from profile_socials where user_id = $1`, [A])).rows.length === 0)

// ---- lobbies ----
const L = (await as(A, `select create_lobby('Valorant','shooter','<b>Test</b>','desc',5,true,'de','Keine','pc','eu','ranked','any',0) id`)).rows[0].id
const lob = (await su(`select * from lobbies where id = $1`, [L])).rows[0]
ok('Lobby erstellt + HTML gestrippt', lob.title === 'Test' && lob.min_rank === null && /^[A-HJ-NP-Z2-9]{4}$/.test(lob.join_code), lob.join_code)
ok('Host ist Mitglied', (await su(`select count(*)::int c from lobby_members where lobby_id = $1`, [L])).rows[0].c === 1)
await expectErr('Zweite Lobby erstellen', A, `select create_lobby('X','other','T','',5,false,'de',null,'pc','eu','casual','any',0)`, [], /bereits in einer anderen/)
await expectErr('Direktes Insert in lobbies', A, `insert into lobbies (host_id, game, title, join_code) values ($1,'x','x','ABCD')`, [A], /permission denied/)
await expectErr('Direktes Update lobby_members', A, `update lobby_members set is_ready = true`, [], /permission denied/)
await expectErr('Ungültige Plattform', B, `select create_lobby('X','other','T','',5,false,'de',null,'nes','eu','casual','any',0)`, [], /check/)
await expectErr('Anon kann keine RPC', null, `select join_lobby($1)`, [L], /permission denied/)

await as(B, `select join_lobby($1)`, [L])
ok('B tritt bei', (await su(`select count(*)::int c from lobby_members where lobby_id = $1`, [L])).rows[0].c === 2)
await expectErr('Doppelt beitreten', B, `select join_lobby($1)`, [L], /Bereits in dieser Lobby/)
await expectErr('Leave-Lock 60s', B, `select leave_lobby($1)`, [L], /Noch (59|60) Sekunden/)

// ready
await as(A, `select set_ready($1, true)`, [L])
ok('Einer ready → kein Timer', (await su(`select all_ready_at from lobbies where id = $1`, [L])).rows[0].all_ready_at === null)
await expectErr('C nicht Mitglied → kein ready', C, `select set_ready($1, true)`, [L], /nicht in dieser Lobby/)
ok('Socials vor Timer verborgen', (await as(B, `select * from profile_socials where user_id = $1`, [A])).rows.length === 0)
await as(B, `select set_ready($1, true)`, [L])
ok('Alle ready → Timer gesetzt', (await su(`select all_ready_at from lobbies where id = $1`, [L])).rows[0].all_ready_at !== null)
ok('Socials nach Timer für Lobby-Mitglied sichtbar', (await as(B, `select * from profile_socials where user_id = $1`, [A])).rows.length === 1)
ok('Socials für Nicht-Mitglied weiter verborgen', (await as(C, `select * from profile_socials where user_id = $1`, [A])).rows.length === 0)
await as(B, `select set_ready($1, false)`, [L])
ok('Un-ready nach Timer blockiert', (await su(`select is_ready from lobby_members where lobby_id = $1 and user_id = $2`, [L, B])).rows[0].is_ready === true)

// join resets timer
await as(C, `select join_lobby($1)`, [L])
ok('Beitritt setzt Timer zurück', (await su(`select all_ready_at from lobbies where id = $1`, [L])).rows[0].all_ready_at === null)

// kick
await expectErr('Nicht-Host kickt', B, `select kick_member($1, $2)`, [L, C], /Nur der Host/)
await expectErr('Host kickt sich selbst', A, `select kick_member($1, $2)`, [L, A], /nicht selbst/)
await as(A, `select kick_member($1, $2)`, [L, C])
ok('Host kickt C', (await su(`select count(*)::int c from lobby_members where lobby_id = $1 and user_id = $2`, [L, C])).rows[0].c === 0)

// messages
await as(A, `insert into lobby_messages (lobby_id, text, username) values ($1, '<i>hallo</i>', 'FAKE')`, [L])
const msg = (await su(`select * from lobby_messages where lobby_id = $1`, [L])).rows[0]
ok('Nachricht: Username vom Server, HTML gestrippt', msg.username === 'Alice2' && msg.text === 'hallo', `${msg.username}/${msg.text}`)
await expectErr('Nicht-Mitglied schreibt', C, `insert into lobby_messages (lobby_id, text) values ($1, 'x')`, [L], /row-level security/)
await expectErr('Nachricht im fremden Namen', B, `insert into lobby_messages (lobby_id, user_id, text) values ($1, $2, 'x')`, [L, A], /row-level security/)
ok('Nicht-Mitglied liest keinen Chat', (await as(C, `select * from lobby_messages where lobby_id = $1`, [L])).rows.length === 0)
await expectErr('Nachricht editieren', A, `update lobby_messages set text = 'x'`, [], /permission denied/)

// join cooldown nach Verlassen (C wurde gekickt → kein Cooldown; C verlässt eigene Lobby)
const L2 = (await as(C, `select create_lobby('Rust','other','C Lobby','',4,false,'de',null,'pc','eu','casual','any',0) id`)).rows[0].id
await su(`update lobby_members set joined_at = now() - interval '2 minutes' where user_id = $1`, [C])
await as(C, `select leave_lobby($1)`, [L2])
ok('Letzter verlässt → Lobby gelöscht', (await su(`select count(*)::int c from lobbies where id = $1`, [L2])).rows[0].c === 0)
await expectErr('Join-Cooldown 45s', C, `select join_lobby($1)`, [L], /Bitte warte noch (44|45) Sekunden/)

// host transfer
await su(`update lobby_members set joined_at = now() - interval '2 minutes' where lobby_id = $1`, [L])
await as(A, `select leave_lobby($1)`, [L])
ok('Host verlässt → Host geht an B', (await su(`select host_id from lobbies where id = $1`, [L])).rows[0].host_id === B)

// ---- friendships ----
await as(A, `insert into friendships (to_id) values ($1)`, [B])
const F = (await su(`select * from friendships`)).rows[0]
ok('Anfrage A→B (from_id = auth.uid)', F.from_id === A && F.status === 'pending')
await expectErr('Gegenanfrage (Unique-Paar)', B, `insert into friendships (to_id) values ($1)`, [A], /duplicate key/)
await expectErr('Anfrage im fremden Namen', C, `insert into friendships (from_id, to_id) values ($1, $2)`, [A, C], /row-level security/)
await expectErr('Direkt accepted anlegen', C, `insert into friendships (to_id, status) values ($1, 'accepted')`, [A], /row-level security/)
ok('Dritte sehen Freundschaft nicht', (await as(C, `select * from friendships`)).rows.length === 0)
ok('Sender kann nicht selbst akzeptieren', (await as(A, `update friendships set status = 'accepted' where id = $1`, [F.id])).affectedRows === 0)
await expectErr('Empfänger ändert from_id', B, `update friendships set from_id = $1 where id = $2`, [C, F.id], /permission denied/)
await as(B, `update friendships set status = 'accepted' where id = $1`, [F.id])
ok('Empfänger akzeptiert', (await su(`select status from friendships where id = $1`, [F.id])).rows[0].status === 'accepted')
ok('Socials für Freund sichtbar', (await as(B, `select * from profile_socials where user_id = $1`, [A])).rows.length === 1)

// ---- ratings ----
await as(A, `insert into ratings (lobby_id, target_id, stars) values ($1, $2, 5)`, [L, B])
await expectErr('Doppelte Bewertung', A, `insert into ratings (lobby_id, target_id, stars) values ($1, $2, 1)`, [L, B], /duplicate key/)
await expectErr('Bewertung im fremden Namen', C, `insert into ratings (lobby_id, rater_id, target_id, stars) values ($1, $2, $3, 1)`, [L, A, B], /row-level security/)
await expectErr('Sterne > 5', C, `insert into ratings (lobby_id, target_id, stars) values ($1, $2, 9)`, [L, B], /check/)
await expectErr('Selbst bewerten', A, `insert into ratings (lobby_id, target_id, stars) values ($1, $2, 5)`, [randomUUID(), A], /check/)
await expectErr('Bewertung ändern', A, `update ratings set stars = 1`, [], /permission denied/)

// ---- login_history ----
await expectErr('login_history gesperrt', A, `select * from login_history`, [], /permission denied/)

// ---- dissolve + cascade ----
await expectErr('Nicht-Host löst auf', A, `select dissolve_lobby($1)`, [L], /Nur der Host/)
await as(B, `select dissolve_lobby($1)`, [L])
ok('Auflösen: Lobby, Members, Messages weg',
  (await su(`select (select count(*) from lobbies)::int + (select count(*) from lobby_members)::int + (select count(*) from lobby_messages)::int c`)).rows[0].c === 0)

// ---- expiry ----
const L3 = (await as(A, `select create_lobby('X','other','Exp','',5,false,'de',null,'pc','eu','casual','any',0) id`)).rows[0].id
await su(`update lobbies set expires_at = now() - interval '1 second' where id = $1`, [L3])
ok('Abgelaufene Lobby unsichtbar', (await as(B, `select * from lobbies where id = $1`, [L3])).rows.length === 0)
await expectErr('Join abgelaufene Lobby', B, `select join_lobby($1)`, [L3], /nicht gefunden/)
const L4 = (await as(A, `select create_lobby('Y','other','Neu','',5,false,'de',null,'pc','eu','casual','any',0) id`)).rows[0].id
ok('Mitglied abgelaufener Lobby kann sofort neue erstellen', !!L4)
ok('Abgelaufene Lobby dabei gelöscht', (await su(`select count(*)::int c from lobbies where id = $1`, [L3])).rows[0].c === 0)
await su(`delete from lobbies where id = $1`, [L4])

// ---- demo seed ----
await as(B, `select seed_demo_lobbies()`)
const demo = (await su(`select count(*)::int c from lobbies l join profiles p on p.id = l.host_id where p.is_demo`)).rows[0].c
ok('Demo-Lobbys angelegt', demo === 3, `(${demo})`)
await as(B, `select seed_demo_lobbies()`)
ok('Seed idempotent', (await su(`select count(*)::int c from lobbies`)).rows[0].c === 3)
const demoLobby = (await su(`select l.id from lobbies l where l.max_slots = 5 and l.game = 'Valorant'`)).rows[0].id
await as(B, `select join_lobby($1)`, [demoLobby])
ok('Echter User joint Demo-Lobby', (await su(`select count(*)::int c from lobby_members where lobby_id = $1`, [demoLobby])).rows[0].c === 4)

// ---- account delete ----
await as(C, `select delete_own_account()`)
ok('Account löschen entfernt Profil + Daten',
  (await su(`select (select count(*) from auth.users where id = $1)::int + (select count(*) from profiles where id = $1)::int c`, [C])).rows[0].c === 0)

// ---- Signup-Metadaten ----
const E = randomUUID()
await su(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'e@t.local', $2)`, [E, {
  username: 'Emma_1',
  favorite_games: ['valorant', '<b>cs2</b>', 42, ...Array.from({ length: 15 }, (_, i) => `g${i}`)],
  social_links: { steam: ' emma_steam ', psn: '', hacker: 'x', xbox: { id: 'obj' } },
}])
const pe = (await su(`select p.favorite_games, s.links from profiles p join profile_socials s on s.user_id = p.id where p.id = $1`, [E])).rows[0]
ok('Signup: Spiele bereinigt + max. 10', pe.favorite_games.length === 10 && pe.favorite_games[1] === 'cs2' && !pe.favorite_games.includes(42), JSON.stringify(pe.favorite_games.slice(0, 3)))
ok('Signup: nur bekannte Plattformen, getrimmt', JSON.stringify(pe.links) === '{"steam":"emma_steam"}', JSON.stringify(pe.links))
const F2 = randomUUID()
await su(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'f@t.local', '{"favorite_games":"kaputt","social_links":[1]}')`, [F2])
ok('Signup: kaputte Metadaten → Defaults', (await su(`select username from profiles where id = $1`, [F2])).rows[0].username === null)

// ---- friend_count ----
ok('friend_count für fremdes Profil', (await as(E, `select friend_count($1) c`, [A])).rows[0].c === 1)
await expectErr('friend_count ohne Login', null, `select friend_count($1)`, [A], /permission denied/)

console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS GRÜN')
process.exit(fails ? 1 : 0)
