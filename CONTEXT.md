## Projektziel
Reine Vermittlungs-Plattform (kein Gameserver, kein Matchmaking). Flow: Lobby erstellen → joinen → Lobby-Chat → eigenes Game. Backend: Supabase (Auth + Postgres + Realtime), Profil/Konto zusätzlich in localStorage.

## Backend (Supabase, Free-Tier)
- **Projekt:** `jbsucnkhtwxmohmaxdkc`, Region eu-west-1 (Irland); DPA gilt über AGB (PDF in `WICHTIGE DOCS/`, nicht im Repo)
- **Env:** `.env.local` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (anon-Key ist öffentlich)
- **Schema:** `supabase/migrations/` → `npm run test:db` → `npx supabase db push`
- **Auth:** E-Mail-Bestätigung Pflicht; Passwort 8+ mit Groß/Klein/Zahl/Sonderzeichen (auch serverseitig); Reset-Link → `PasswordResetModal`
- **Mails:** eingebautes Supabase-SMTP nur an Org-Mitglieder + stark limitiert → EU-SMTP nötig (Modul 27)
- **Free-Tier:** pausiert nach 7 Tagen Inaktivität, keine Backups → vor Launch Pro oder Backups

## Deployment Frontend
- **Ziel:** Hetzner Webhosting (DE) — Deploy automatisch per GitHub Action `.github/workflows/deploy.yml` bei Push auf main (test:db → build → FTPS nach `public_html/`); aktiv erst mit Repo-Variable `DEPLOY_ENABLED=true`
- **GitHub Variables:** `DEPLOY_ENABLED`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `FTP_SERVER_DIR` · **Secrets:** `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`
- **`public/.htaccess`:** HTTPS-Redirect, SPA-Fallback, Security-Header inkl. CSP (Supabase-URL darin hart hinterlegt!), Caching
- **Alt (abschalten nach Hetzner-Go-live):** `pau-sa.web.app` (Firebase Hosting, alte Firestore-Version) · Vercel

## Supabase-Tabellen
| Tabelle | Inhalt | Zugriff |
|---|---|---|
| `profiles` | id, username (unique, case-insensitive), favorite_games, is_demo, left_lobby_at | lesen: eingeloggt; ändern: nur eigenes (username, favorite_games) |
| `profile_socials` | user_id, links {steam, psn, xbox, epic, nintendo} | lesen: `can_see_socials()`; ändern: nur eigene |
| `lobbies` | Lobby-Felder, host_id, join_code, expires_at (4h), all_ready_at | lesen: eingeloggt + nicht abgelaufen; schreiben: nur RPC |
| `lobby_members` | lobby_id, user_id (1 Lobby pro User), is_ready, joined_at | lesen: eingeloggt; schreiben: nur RPC |
| `lobby_messages` | lobby_id, user_id, username (vom Server), text ≤300 | nur Lobby-Mitglieder; unveränderbar |
| `friendships` | from_id, to_id (Unique-Paar), status | nur Beteiligte; annehmen nur Empfänger |
| `ratings` | lobby_id, rater_id, target_id, stars 1–5, comment | anlegen nur als rater; unveränderbar |
| `login_history` | user_id, ip, country, city, user_agent | nur Server (für Login-Alert, noch ungenutzt) |

## localStorage-Keys
| Key | Inhalt |
|---|---|
| `pausa_profile` | userId, username, favoriteGames[], socialLinks{}, savedAt |
| `pausa_birth_date_locked` | Geburtsdatum — immutable |
| `pausa_session` | userId, username, loggedInAt |
| `pausa_account` | usernameChanges[] (ISO), künftig: E-Mail, Passwort, Sichtbarkeit |
| `pausa_verified` | `'true'` nach Altersverifizierung (persistiert über Reloads) |

## Terminologie
| Begriff | Bedeutung | Sichtbarkeit |
|---|---|---|
| **Nickname** | Interner PauSa-Benutzername (`profiles.username` + localStorage) | Immer sichtbar — kein Privacy-Shield |
| **Username** | Plattformbezogener Name (Steam, PSN, Xbox, Epic, Nintendo) | Privacy-Shield: nur für Freunde / nach `allReadyAt` sichtbar |

> Wenn in Gesprächen oder Tickets von „Nickname" die Rede ist → interner App-Name. „Username" → platform-spezifische Social-ID.

## Grundsätzliche Regeln
> Vor jedem Fix oder Feature prüfen ob eine Regel greift — Logik nur in der zentralen Utility ändern, nie inline duplizieren.

| Regel | Gilt für | Logik | Zentrale Implementierung |
|---|---|---|---|
| Social-IDs Sichtbarkeit | Alle Profil-Ansichten (bestehende + zukünftige) | `isOwnProfile \|\| isFriend \|\| inSameLobby` | `src/utils/socialPrivacy.js → socialVisible()` |

### Social-IDs Sichtbarkeit
- **Eigenes Profil** (`isOwnProfile`): immer sichtbar
- **Freunde** (`isFriend`): immer sichtbar — Status `'accepted'` aus `friendService`
- **Gemeinsame Lobby** (`inSameLobby`): sichtbar sobald `lobby.allReadyAt` gesetzt ist (Ready-Timer gestartet)
- Alle anderen Fälle → `🔒`-Placeholder
- `PlayerProfileCard` empfängt `inSameLobby`-Prop; `LobbyDetail` setzt `inSameLobby={!!lobby?.allReadyAt}`
- `ReadySystem` MemberAddPanel: bereits korrekt geregelt via `timerPhase !== null`
- **Neue Profil-View?** → `socialVisible(isOwn, isFriend, inSameLobby)` importieren, nie eigene Bedingung schreiben

## Datenmodell-Entscheidungen

### Profil vs. Konto
- **Profil** (`pausa_profile`): spielbezogen — Username, Hauptspiele, Rang, Platform-IDs. Ggf. sichtbar für andere.
- **Konto** (`pausa_account`): personenbezogen — E-Mail, Passwort, Sichtbarkeitseinstellungen. Nur für User selbst.
- **Username:** max. 2× änderbar pro Jahr; in `pausa_account.usernameChanges: [ISO-Datum]`.

### Geburtsdatum-Validierung (`validateBirthDate`)
Zukunft / >120 Jahre / <13 Jahre (DSGVO) → abgelehnt. 29.2. in Nicht-Schaltjahr → abgelehnt. Schaltjahr: ÷4 AND (nicht ÷100 OR ÷400).

### Altersverifizierung
- `isVerified` → in `pausa_verified` persistiert (kein Reset bei Reload)
- `verificationRequired` nur wenn: Alter ≥ 16 UND noch nicht verifiziert
- Placeholder-Flow (simulierter Upload); in Produktion durch Backend-Endpunkt ersetzen

### socialLinks-Schema
```js
{ steam: { id: string|null }, epic: { id: string|null },
  psn:   { id: string|null }, xbox: { id: string|null }, nintendo: { id: string|null } }
```
Im KontoTab editierbar. Privacy-Shield: IDs nur sichtbar per `socialVisible()` — siehe **Grundsätzliche Regeln**.

### Freundesystem
- `friendService.js` — Supabase-Tabelle `friendships`, Echtzeit via `liveQuery`
- Status-Enum: `'pending_sent' | 'pending_received' | 'accepted' | null`
- Mock-Spieler: `src/data/mockPlayers.js` (u1–u12, 12 Profile mit Tier/Games/Bio)
- `PlayerProfileCard`: `userId` + `fallbackUsername`; falls `getMockPlayer(userId)` null → Fallback-Objekt aus Lobby-Kontext

### LobbyDetail-Verhalten
- Öffnet sich bei Lobby-Klick (ersetzt Feed); rechte Sidebar bleibt sichtbar
- Echtzeit via `subscribeLobby`; schließt automatisch wenn Lobby gelöscht wird
- Chat + ReadySystem nur für Mitglieder sichtbar; Mitglieder klickbar → `PlayerProfileCard`

### MessagesPanel
- Trigger: 💬-Button (z-60), Slide-in von rechts (z-55, unter Navbar)
- Tabs: Nachrichten (Gruppen/Clan 👥/⚔️) · Lobby-Chat · Einladungen (Annehmen/Ablehnen, nicht persistiert)

## Modul-Roadmap
| # | Modul | Status | Hinweis |
|---|---|---|---|
| 0 | AgeVerification | ✅ Fertig | verificationService + VerificationContext + Banner; Geburtsdatum-Lock; isVerified persistiert |
| 1 | Navbar | ✅ Fertig | Tabs: Lobbys / Gruppen / Mein Profil / Konto; Logo → Startseite |
| 2 | Hero | ✅ Fertig | Hauptbanner, CTA |
| 3 | GameFilter | ✅ Fertig | Controlled; Game-Buttons aus Lobby-Daten; Anzahl-Badge |
| 4 | LfgFeed | ✅ Fertig | Supabase-Echtzeit; klickbare Karten; Age-Gating (16+/18+ per ageRating); alle Filter aktiv |
| 5 | CreateLobby | ✅ Fertig | Modal; Plattform-Feld (Crossplay/PC/PS/Xbox/Switch); altersgerechter Spiel-Filter via useVerification |
| 6 | UserProfile | ✅ Fertig | Avatar, Stats, Rang-Badges; Bewertungen-Tab: Durchschnitt + Sterne + Einzelbewertungen via ratingService |
| 7 | ReadySystem | ✅ Fertig | Ready-Toggle (RPC `set_ready`); Rating-Prompt wenn alle ready + Session reif |
| 8 | LobbyDetail | ✅ Fertig | Echtzeit; auto-close bei Löschung; Chat via `lobby_messages` (nur Mitglieder); eigene Nachrichten rechts |
| 9 | MessagesPanel | ✅ Fertig | Drawer, Tabs, Unread-Badge; Lobby-Chat Echtzeit via subscribeChat + sendMessage; async getUserLobby-Bug behoben |
| 10 | LobbyHoppingGuard | ✅ Fertig | 60s/45s Cooldowns; Live-Countdown |
| 11 | GroupFeed | ✅ Fertig | Clans; Einladungen-Flow: sendInvite + acceptInvite + declineInvite; InvitePanel in GroupDetail (Admin); MessagesPanel Einladungen-Tab live; GroupCard Invite-Badge |
| 12 | FriendsSystem | ✅ Fertig | friendService + FriendsList + PlayerProfileCard; Privacy-Shield |
| 13 | FilterPanel | ✅ Fertig | Spiel + Sprache + Mic + Mindestrang; Desktop expandierbar, Mobile Drawer; Reset-Button; activeFilterCount Badge |
| 14 | KontoTab | ✅ Fertig | Plattform-IDs, Username, E-Mail-Änderung, Passwort-Änderung (Re-Auth), Sichtbarkeit (3-stufig), Konto löschen |
| 15 | RatingSystem | ✅ Fertig | ratingService.js (localStorage); RatingModal (1–5 Sterne + Kommentar); Trigger in ReadySystem (alle ready + ≥20 Min; DEV=0ms) |
| 16 | AgeGating | ✅ Fertig | ageRating in games.js (USK-basiert: 6/12/16/18); LfgFeed filtert automatisch per useVerification().age |
| 17 | Auth | ✅ Fertig | E-Mail/Passwort via Supabase Auth mit E-Mail-Bestätigung (vorher Firebase); AuthContext auf `onAuthStateChange`, Username aus DB; authService.js; Session-Funktionen aus profileService entfernt; `validatePassword()`: 8+ Zeichen, Großbuchstabe, Zahl, Sonderzeichen |
| 18 | JoinCode | ✅ Fertig | 4-stelliger Code per Lobby (serverseitig generiert, unique); Copy-Button in LobbyDetail; Code-Eingabe im Feed; `findLobbyByCode` |
| 19 | ReconnectionWindow | Offen | disconnectedAt in members[]; Cloud Function räumt nach 30s auf |
| 22 | LobbyAbbruch | Offen | "Lobby beenden"-Button für Host in LobbyDetail; Grund wählbar (Absturz / Lobby-Drop / Sonstiges); löscht Lobby-Doc + Messages-Sub-Collection; Rating-Prompt überspringen wenn Abbruch < 5 Min nach joinedAt |
| 20 | PresenceReadyState | Offen (nach 17) | isReady → Supabase Realtime Presence; auto-reset bei Browser-Close |
| 21 | TOTP-2FA | Offen (nach 14) | Supabase Auth MFA (TOTP ist im Projekt bereits aktiviert); Enrollment in KontoTab; Challenge-Step im LoginModal |
| 23 | PocketBaseMigration | ⛔ Verworfen | Referenz-Commit `7f8ae17`; ersetzt durch Supabase (kostenlos, kein Serverbetrieb nötig) |
| 24 | LobbyServerAuthority | ✅ Fertig (SQL) | RPCs `create_lobby/join_lobby/leave_lobby/kick_member/set_ready/dissolve_lobby` mit Row-Locks; Cooldowns serverseitig (`profiles.left_lobby_at`); Host-Übergabe beim Verlassen; direkte Writes auf `lobbies`/`lobby_members` gesperrt |
| 26 | SupabaseMigration | 🔧 In Arbeit | ✅ Schema/RLS/RPCs/Realtime/pg_cron live · ✅ `npm run test:db` (70 Tests) · ✅ Services auf supabase-js (`liveQuery`, Lobby nur per RPC) · ✅ Onboarding: Konto erst am Ende, Profil per Signup-Metadaten, E-Mail-Bestätigung · ✅ `PasswordResetModal` · ✅ PocketBase, ipapi.co, loginAlert/locationService entfernt · ✅ Google Fonts lokal (@fontsource) · Offen: Login-Alert neu (Edge Function, braucht SMTP) |
| 28 | Hosting Hetzner Webhosting | 🔧 In Arbeit | ✅ GitHub Action + `.htaccess` vorbereitet · ✅ Paket + Domain `pau-sa.de` freigeschaltet (FTP `www782.your-server.de`, User `e2twcy`) · ✅ Verzeichnisschutz (Testphase) in konsoleH + als TESTPHASE-Block in `public/.htaccess` (sonst vom Deploy überschrieben) · ✅ GitHub Secrets/Variables + `DEPLOY_ENABLED=true`, erster Deploy grün · ✅ Let's-Encrypt-Zertifikat `*.pau-sa.de` + `pau-sa.de` installiert (HTTP→HTTPS 301, Basic-Auth 401, `.ht*` 403 geprüft) · ✅ `site_url`/Redirects auf `pau-sa.de` per `config push` (nur Auth) · Offen: App-Funktion + CSP im Browser prüfen |
| 27 | EU-SMTP | 🔧 In Arbeit | ✅ Brevo-Domain `pau-sa.de` authentifiziert (brevo-code, DKIM brevo1/2, DMARC, Branding `r.mail`/`img.mail`) · ✅ Absender `PauSa <noreply@pau-sa.de>` · ✅ `[auth.email.smtp]` (smtp-relay.brevo.com:587, Key in `supabase/.env`) + `email_sent = 30/h` per `config push` · Offen: Registrierung mit fremder Adresse testen · Später: Newsletter über eigenen Absender `newsletter@`, Login-Alert als Edge Function |

## Infrastruktur
| Bereich | Status | Details |
|---|---|---|
| Supabase | ✅ Live (Free) | Projekt `jbsucnkhtwxmohmaxdkc`, eu-west-1; Auth, Postgres, Realtime, pg_cron |
| Firebase Hosting | ✅ Live | `https://pau-sa.web.app` (nur statisches Frontend) |
| Vercel | ✅ Backup | Fallback-Deployment |

## Technische Schulden
| # | Schuld | Prio |
|---|---|---|
| T1 | `MemberRow` in `LobbyDetail` mit `React.memo` | Niedrig |
| T2 | `getUserLobby` scannt alle Lobbys (members ist JSON) → Member-Relation/Join-Tabelle | Niedrig |
| T4 | ~~`lobbies` für jeden eingeloggten User beschreibbar~~ → gelöst durch RPCs (Modul 24) | ✅ |
| T5 | ~~Privacy-Shield nur clientseitig~~ → `profile_socials` + `can_see_socials()` serverseitig | ✅ |
| T6 | Ratings prüfen nicht, ob Rater und Ziel wirklich in der Lobby waren (Lobby ist danach gelöscht) → Teilnahme-Historie | Mittel |
| T3 | `isReady: false` beim Join — Unittest fehlt | Mittel |

## Behobene Bugs (Referenz)
B1 UserProfile zeigte mockProfile · B2 GroupCard/Detail nutzten MOCK_CURRENT_USER · B3 ReadySystem.lobby nicht aktualisiert · B4 Cooldown-Countdown fehlte · B5 isVerified-Reset bei Reload · B6 Hero-Button im eingeloggten Zustand sichtbar · B7 Lobbys nur lokal (→ DB) — alle ✅ behoben

> Entfernt: ~~Matchmaking~~, ~~Tournaments~~, ~~DataBackup~~ (Sicherheitsrisiko)
