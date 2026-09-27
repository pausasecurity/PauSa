## Projektziel
Reine Vermittlungs-Plattform (kein Gameserver, kein Matchmaking). Flow: Lobby erstellen → joinen → Lobby-Chat → eigenes Game. Lobbys in Firestore (Echtzeit/cross-device), Profil/Konto in localStorage.

## Deployment
- **Live:** `https://pau-sa.web.app` — `npm run build && firebase deploy`
- **Backup:** Vercel (`dist/`)
- **Firestore Rules:** `allow read, write: if true` — TODO nach Firebase-Auth sichern

## Firestore-Collections
| Collection | Doc-ID | Felder |
|---|---|---|
| `lobbies` | lobbyId | game, gameCategory, title, description, maxSlots, requiresMic, language, minRank, platform, members[], createdBy, joinCode, createdAt, expiresAt (TTL 4h) |
| `lobbies/{id}/messages` | messageId | userId, username, text, at (ISO) |

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
- `friendService.js` — localStorage-CRUD
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
| 17 | FirebaseAuth | ✅ Fertig | E-Mail/Passwort via Firebase Auth; AuthContext auf onAuthStateChanged; Firestore Rules gesichert (`request.auth != null`); authService.js; Session-Funktionen aus profileService entfernt; `validatePassword()`: 8+ Zeichen, Großbuchstabe, Zahl, Sonderzeichen |
| 18 | JoinCode | ✅ Fertig | 4-stelliger Code per Lobby (Firestore); Copy-Button in LobbyDetail; Code-Eingabe im Feed; `findLobbyByCode` |
| 19 | ReconnectionWindow | Offen | disconnectedAt in members[]; Cloud Function räumt nach 30s auf |
| 22 | LobbyAbbruch | Offen | "Lobby beenden"-Button für Host in LobbyDetail; Grund wählbar (Absturz / Lobby-Drop / Sonstiges); löscht Lobby-Doc + Messages-Sub-Collection; Rating-Prompt überspringen wenn Abbruch < 5 Min nach joinedAt |
| 20 | PresenceReadyState | Offen (nach 17) | isReady → Firebase RTDB Presence; auto-reset bei Browser-Close |
| 21 | TOTP-2FA | Offen (nach 14) | Authenticator-App (Google Authenticator/Authy); Enrollment in KontoTab (QR-Code + Verify); Challenge-Step im LoginModal nach E-Mail/Passwort; Backup-Codes generieren + anzeigen; `TotpMultiFactorGenerator` aus Firebase Auth |

## Infrastruktur
| Bereich | Status | Details |
|---|---|---|
| Firebase Firestore | ✅ Live | Collection `lobbies` + Sub-Collection `messages`; Echtzeit; cross-device |
| Firebase Hosting | ✅ Live | `https://pau-sa.web.app` |
| Vercel | ✅ Backup | Fallback-Deployment |
| Firestore Rules | ✅ Gesichert | `request.auth != null` für `lobbies` + `lobbies/{id}/messages` |

## Technische Schulden
| # | Schuld | Prio |
|---|---|---|
| T1 | `MemberRow` in `LobbyDetail` mit `React.memo` | Niedrig |
| T2 | Firestore-Query `where('expiresAt', '>', now)` statt Collection-Scan | Niedrig |
| T3 | `isReady: false` beim Join — Unittest fehlt | Mittel |

## Behobene Bugs (Referenz)
B1 UserProfile zeigte mockProfile · B2 GroupCard/Detail nutzten MOCK_CURRENT_USER · B3 ReadySystem.lobby nicht aktualisiert · B4 Cooldown-Countdown fehlte · B5 isVerified-Reset bei Reload · B6 Hero-Button im eingeloggten Zustand sichtbar · B7 Lobbys nur lokal (→ Firestore) — alle ✅ behoben

> Entfernt: ~~Matchmaking~~, ~~Tournaments~~, ~~DataBackup~~ (Sicherheitsrisiko)
