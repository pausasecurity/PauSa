# PAUSA: ENTWICKLER-GUIDE

Senior-Entwickler, direkt im Terminal. Priorität: Geschwindigkeit, Modularität, technischer Fokus.

## Arbeitsweise
- **Aktion vor Worten:** Terminal-Befehle sofort ausführen, dann antworten.
- **Keine Floskeln:** Kein Intro, keine Höflichkeit.
- **Output:** Code/Bestätigung zuerst, dann kurze stichpunktartige Änderungsliste.
- **Modularität:** UI-Komponenten, Hooks, Services → separate Dateien.
- **Unklar?** Kurz und direkt nachfragen.

## Roadmap-Pflege (Pflicht)
Nach jedem abgeschlossenen Schritt die Modul-Roadmap in `CONTEXT.md` aktualisieren: `✅ Fertig` / `🔧 In Arbeit` / `Offen`. Danach auf nächsten Befehl warten.

## Architektur
- **Block-System:** Komplexe Komponenten mit `// --- MODULE: [NAME] ---` — erst bei expliziter Nachfrage implementieren.
- **Ordnerstruktur:**
  - `/src/components` — Feature-Komponenten
  - `/src/components/shared` — Wiederverwendbare UI-Primitives
  - `/src/hooks` — Custom Hooks
  - `/src/services` — Daten-Services (Supabase + localStorage); `supabase.js` = Client, `must()`, `liveQuery()`, `isUuid()`
  - `/supabase/migrations` — Schema, RLS, RPCs (versioniert); `/supabase/tests/rls.test.mjs` → `npm run test:db`
  - `/src/context` — React Contexts
  - `/src/data` — Statische Daten & Konstanten (`PLATFORM_META`, `PLATFORM_ICONS`, `TIER_COLORS`)
  - `/src/utils` — Utility-Funktionen (`sanitize.js`)
- **Stack:** ES6+, React-Hooks, Tailwind CSS
- **Backend-Regel:** Nie `supabase` direkt in Komponenten — immer über die Services in `/src/services`.
- **DataStore-Prinzip:** Services sind einziger Transport-Layer → Backend-Wechsel berührt keine Komponente.
- **Schema-Regel:** Tabellen/Policies/Funktionen nur per neuer Datei in `supabase/migrations/` ändern (nie im Dashboard, nie bestehende Migration editieren). Ablauf: Migration schreiben → `npm run test:db` → `npx supabase db push`.
- **Lobby-Mutationen:** nur per RPC (`create_lobby`, `join_lobby`, `leave_lobby`, `kick_member`, `set_ready`, `dissolve_lobby`) — direkte Writes auf `lobbies`/`lobby_members` sind per Grant gesperrt.
- **Neue SECURITY-DEFINER-Funktion:** immer `set search_path = ''`, `revoke execute … from public, anon`, gezielt `grant … to authenticated`.

## Sicherheit
- **Sanitization** (vor jedem DB-Write):
  - `sanitizeText(val, maxLen)` — HTML strippen, trim, kürzen
  - `sanitizeUsername(val)` — `[\w\-]`, 3–30 Zeichen
  - `sanitizeClanTag(val)` — alphanumerisch, uppercase, 2–5 Zeichen
- **Privacy Shield:** serverseitig — `profile_socials` nur lesbar per `can_see_socials()` (eigenes Profil / Freund / gemeinsame Lobby nach `all_ready_at`). UI zeigt sonst `🔒`-Placeholder.
- **anon sieht nichts:** Alle Tabellen nur für `authenticated`; einzige anon-RPC: `username_available`.
- **Kein Daten-Export:** `exportData()`/`importData()` entfernt (Sicherheitsrisiko).
- **Error Boundary:** `ErrorBoundary.jsx` wraps den App-Root.

## Performance
- `GroupCard`, `FriendRow` → `React.memo`
- `GroupFeed`, `FriendsList` → `React.useMemo`
- Cooldown-Ticker: `setInterval` 500ms, per `useEffect`-Cleanup gestoppt.
- Realtime-Subscriptions (`liveQuery`) → per `useEffect`-Cleanup getrennt.
- **TODO (T1):** `MemberRow` in `LobbyDetail` mit `React.memo` wrappen.

## z-Index-Hierarchie
| z | Komponente |
|---|---|
| 50 | Navbar |
| 55 | MessagesPanel |
| 60 | MessagesPanel-Button |
| 90 | GroupDetail / CreateGroupModal |
| 95 | OnboardingModal, PlayerProfileCard |
| 98 | LoginModal, PasswordResetModal, EmailConfirmModal |
| 100 | VerificationBanner |
| 200 | Toast |

## Lobby-Hopping-Schutz
```
Beitritt → [60s Lock] → Verlassen → [45s Cooldown] → Neuer Beitritt
```
- Durchgesetzt serverseitig in `join_lobby`/`leave_lobby` (`profiles.left_lobby_at`, `lobby_members.joined_at`)
- `LEAVE_BLOCK_MS`/`JOIN_BLOCK_MS` in `lobbyService.js` + `_leftAt` nur für den UI-Countdown
- Demo-Member `joined_at = epoch` → kein Cooldown

## Realtime-Architektur (Supabase)
```
subscribeToLobbies(cb) → liveQuery([lobbies, lobby_members])            → LfgFeed
subscribeLobby(id, cb) → liveQuery([lobbies, lobby_members]) → fetch id → LobbyDetail
subscribeChat(id, cb)  → liveQuery([lobby_messages lobby_id=eq.id])     → LobbyChat
seedIfEmpty()          → rpc('seed_demo_lobbies') (nach Login)
pg_cron (5 min)        → purge_expired_lobbies() (Members + Messages via cascade)
```
`liveQuery` = Fetch + Refetch bei jedem postgres_change (debounced). Delete-Events sind nicht filterbar → Tabellen mit relevanten Deletes ohne Filter abonnieren. Lobby-Shape nach außen unverändert (`lobbyId`, `members[]`, `createdBy`, ISO-Timestamps).

## Was wir bewusst NICHT übernehmen (OSS-Analyse)
| Pattern | Warum nicht |
|---|---|
| Authoritative Game-Server (Colyseus) | Kein Gameserver — Lobby-Regeln reichen als Postgres-RPCs |
| Binäre Diffs / MsgPack | Supabase Realtime + Refetch reicht bei unserer Datenmenge |
| CRDT-Merge (Liveblocks) | Kein simultanes Editieren — jeder toggled nur sein `isReady` |
| Spectator-Rolle | Nicht im Scope |

## Komponentenübersicht
| Datei | Zweck |
|---|---|
| `App.jsx` | AppShell: Routing, Hero, GameFilter, LfgFeed, CreateLobby, UserProfile, GroupFeed, Footer |
| `LobbyDetail.jsx` | Lobby-Ansicht: Mitglieder (klickbar), ReadySystem, Chat (Members-only); Echtzeit |
| `ReadySystem.jsx` | Ready-Toggle + Social-Add; empfängt `lobby`-Prop (kein eigenständiger Fetch) |
| `MessagesPanel.jsx` | Slide-in Nachrichten-Drawer (bottom-right Trigger) |
| `KontoTab.jsx` | Plattform-IDs, Username-Änderung |
| `PlayerProfileCard.jsx` | Spielerprofil + Freund-hinzufügen (Mock + Fallback für echte User) |
| `OnboardingModal.jsx` | 4-Schritte Profil-Erstellung |
| `VerificationBanner.jsx` | Altersverifizierungs-Modal (z-100) |
| `GroupCard/Detail.jsx` | Gruppen/Clan-Ansicht |
| `FriendsList.jsx` | Freundesliste + Anfragen-Management |
| `CreateLobbyModal.jsx` | Lobby-Formular; `createLobby` async |
