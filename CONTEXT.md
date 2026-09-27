## Projektziel
Reine Vermittlungs-Plattform (kein Gameserver, kein Matchmaking). Flow: Lobby erstellen → joinen → Lobby-Chat → eigenes Game. Backend: PocketBase (Auth + DB + Realtime), Profil/Konto zusätzlich in localStorage.

## Backend (PocketBase v0.40.4)
- **Lokal:** `npm run pb` → `http://127.0.0.1:8090` (Dashboard `/_/`), Frontend liest `VITE_PB_URL`
- **Schema:** `pocketbase/pb_migrations/` (versioniert, inkl. Access-Rules) — Änderungen nur per neuer Migration
- **Hooks:** `pocketbase/pb_hooks/main.pb.js` — `POST /api/pausa/login-check`, Cron `lobbyCleanup` (5 min), `allReadyAt` = Serverzeit
- **SMTP:** im Dashboard konfigurieren (Settings → Mail) — nötig für Login-Alert, Passwort-Reset, E-Mail-Änderung
- **Hosting:** Offen (PocketHost / Fly.io / VPS)

## Deployment Frontend
- **Live:** `https://pau-sa.web.app` — `npm run build && firebase deploy --only hosting`
- **Backup:** Vercel (`dist/`)

## PocketBase-Collections
| Collection | Felder | Rules |
|---|---|---|
| `users` (auth) | email, username, usernameLower, socialLinks{}, favoriteGames[] | list/view: eingeloggt (E-Mail verborgen); update/delete: nur selbst |
| `lobbies` | game, gameCategory, title, description, maxSlots, requiresMic, language, minRank, platform, region, mode, gender, minAge, members[], createdBy, joinCode, createdAt, expiresAt (TTL 4h), allReadyAt | alles: eingeloggt |
| `lobby_messages` | lobby (Relation, cascadeDelete), userId, username, text, at | create nur mit eigener userId; unveränderbar |
| `friendships` | userA < userB (Unique), from, to, fromUsername, toUsername, status | nur Beteiligte; create nur als `from` |
| `ratings` | lobbyId, raterId, targetId, targetUsername, stars 1–5, comment, at | create nur als `raterId`; Unique pro Tripel; unveränderbar |
| `loginHistory` | user, ip, city, country, loginAt | nur Server (Hook) |

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
| **Nickname** | Interner PauSa-Benutzername (`username`-Feld in Firestore/localStorage) | Immer sichtbar — kein Privacy-Shield |
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
- `friendService.js` — PocketBase-Collection `friendships`, Echtzeit
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
| 4 | LfgFeed | ✅ Fertig | Firestore-Echtzeit; klickbare Karten; Age-Gating (16+/18+ per ageRating); alle Filter aktiv |
| 5 | CreateLobby | ✅ Fertig | Modal; Plattform-Feld (Crossplay/PC/PS/Xbox/Switch); altersgerechter Spiel-Filter via useVerification |
| 6 | UserProfile | ✅ Fertig | Avatar, Stats, Rang-Badges; Bewertungen-Tab: Durchschnitt + Sterne + Einzelbewertungen via ratingService |
| 7 | ReadySystem | ✅ Fertig | Ready-Toggle (Firestore); Rating-Prompt wenn alle ready + Session reif |
| 8 | LobbyDetail | ✅ Fertig | Echtzeit; auto-close bei Löschung; Chat via Firestore Sub-Collection; eigene Nachrichten rechts |
| 9 | MessagesPanel | ✅ Fertig | Drawer, Tabs, Unread-Badge; Lobby-Chat Echtzeit via subscribeChat + sendMessage; async getUserLobby-Bug behoben |
| 10 | LobbyHoppingGuard | ✅ Fertig | 60s/45s Cooldowns; Live-Countdown |
| 11 | GroupFeed | ✅ Fertig | Clans; Einladungen-Flow: sendInvite + acceptInvite + declineInvite; InvitePanel in GroupDetail (Admin); MessagesPanel Einladungen-Tab live; GroupCard Invite-Badge |
| 12 | FriendsSystem | ✅ Fertig | friendService + FriendsList + PlayerProfileCard; Privacy-Shield |
| 13 | FilterPanel | ✅ Fertig | Spiel + Sprache + Mic + Mindestrang; Desktop expandierbar, Mobile Drawer; Reset-Button; activeFilterCount Badge |
| 14 | KontoTab | ✅ Fertig | Plattform-IDs, Username, E-Mail-Änderung, Passwort-Änderung (Re-Auth), Sichtbarkeit (3-stufig), Konto löschen |
| 15 | RatingSystem | ✅ Fertig | ratingService.js (localStorage); RatingModal (1–5 Sterne + Kommentar); Trigger in ReadySystem (alle ready + ≥20 Min; DEV=0ms) |
| 16 | AgeGating | ✅ Fertig | ageRating in games.js (USK-basiert: 6/12/16/18); LfgFeed filtert automatisch per useVerification().age |
| 17 | Auth | ✅ Fertig | E-Mail/Passwort via PocketBase Auth (vorher Firebase, → Modul 23); AuthContext auf `pb.authStore.onChange`; authService.js; Session-Funktionen aus profileService entfernt; `validatePassword()`: 8+ Zeichen, Großbuchstabe, Zahl, Sonderzeichen |
| 18 | JoinCode | ✅ Fertig | 4-stelliger Code per Lobby (Firestore); Copy-Button in LobbyDetail; Code-Eingabe im Feed; `findLobbyByCode` |
| 19 | ReconnectionWindow | Offen | disconnectedAt in members[]; Cloud Function räumt nach 30s auf |
| 22 | LobbyAbbruch | Offen | "Lobby beenden"-Button für Host in LobbyDetail; Grund wählbar (Absturz / Lobby-Drop / Sonstiges); löscht Lobby-Doc + Messages-Sub-Collection; Rating-Prompt überspringen wenn Abbruch < 5 Min nach joinedAt |
| 20 | PresenceReadyState | Offen (nach 17) | isReady → PocketBase Realtime-Presence (SSE-Disconnect); auto-reset bei Browser-Close |
| 21 | TOTP-2FA | Offen (nach 14) | PocketBase: MFA + OTP nativ (Auth-Collection-Optionen); Enrollment in KontoTab; Challenge-Step im LoginModal |
| 23 | PocketBaseMigration | ✅ Fertig | Firebase komplett ersetzt (Auth, DB, Functions); Service-Signaturen unverändert; `subscribeList()`-Helper für Realtime; Migration + Hooks versioniert; 25/25 Rule-Tests + Realtime-Test grün |
| 24 | LobbyServerAuthority | Offen | Lobby-Mutationen (join/leave/kick/ready/dissolve) als PB-Custom-Routes; `lobbies`-updateRule/deleteRule sperren; Cooldowns serverseitig |
| 25 | PocketBaseHosting | Offen | Deploy-Ziel wählen; SMTP; Backups; `VITE_PB_URL` in Prod setzen |

## Infrastruktur
| Bereich | Status | Details |
|---|---|---|
| PocketBase | 🔧 Lokal | Auth, Collections, Realtime, Hooks, Cron; Hosting offen |
| Firebase Hosting | ✅ Live | `https://pau-sa.web.app` (nur statisches Frontend) |
| Vercel | ✅ Backup | Fallback-Deployment |

## Technische Schulden
| # | Schuld | Prio |
|---|---|---|
| T1 | `MemberRow` in `LobbyDetail` mit `React.memo` | Niedrig |
| T2 | `getUserLobby` scannt alle Lobbys (members ist JSON) → Member-Relation/Join-Tabelle | Niedrig |
| T4 | `lobbies` für jeden eingeloggten User beschreibbar (Parität zu alten Firestore-Rules) → Modul 24 | Hoch |
| T5 | Social-IDs in `users` für alle Eingeloggten lesbar; Privacy-Shield nur clientseitig | Mittel |
| T3 | `isReady: false` beim Join — Unittest fehlt | Mittel |

## Behobene Bugs (Referenz)
B1 UserProfile zeigte mockProfile · B2 GroupCard/Detail nutzten MOCK_CURRENT_USER · B3 ReadySystem.lobby nicht aktualisiert · B4 Cooldown-Countdown fehlte · B5 isVerified-Reset bei Reload · B6 Hero-Button im eingeloggten Zustand sichtbar · B7 Lobbys nur lokal (→ Firestore) — alle ✅ behoben

> Entfernt: ~~Matchmaking~~, ~~Tournaments~~, ~~DataBackup~~ (Sicherheitsrisiko)
