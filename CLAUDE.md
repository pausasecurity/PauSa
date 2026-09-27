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
  - `/src/services` — Daten-Services (Firestore + localStorage)
  - `/src/context` — React Contexts
  - `/src/data` — Statische Daten & Konstanten (`PLATFORM_META`, `PLATFORM_ICONS`, `TIER_COLORS`)
  - `/src/utils` — Utility-Funktionen (`sanitize.js`)
- **Stack:** ES6+, React-Hooks, Tailwind CSS
- **Firestore-Regel:** Nie Firestore direkt in Komponenten — immer über `lobbyService.js`.
- **DataStore-Prinzip:** `lobbyService.js` ist einziger Transport-Layer → Wechsel auf Supabase/RTDB berührt keine Komponente.

## Sicherheit
- **Sanitization** (vor jedem Firestore-Write):
  - `sanitizeText(val, maxLen)` — HTML strippen, trim, kürzen
  - `sanitizeUsername(val)` — `[\w\-]`, 3–30 Zeichen
  - `sanitizeClanTag(val)` — alphanumerisch, uppercase, 2–5 Zeichen
- **Privacy Shield:** Social IDs in `PlayerProfileCard.jsx` nur wenn `isFriend === true` — sonst `🔒`-Placeholder.
- **Kein Daten-Export:** `exportData()`/`importData()` entfernt (Sicherheitsrisiko).
- **Error Boundary:** `ErrorBoundary.jsx` wraps den App-Root.

## Performance
- `GroupCard`, `FriendRow` → `React.memo`
- `GroupFeed`, `FriendsList` → `React.useMemo`
- Cooldown-Ticker: `setInterval` 500ms, per `useEffect`-Cleanup gestoppt.
- Firestore `onSnapshot` → per `useEffect`-Cleanup getrennt.
- **TODO (T1):** `MemberRow` in `LobbyDetail` mit `React.memo` wrappen.

## z-Index-Hierarchie
| z | Komponente |
|---|---|
| 50 | Navbar |
| 55 | MessagesPanel |
| 60 | MessagesPanel-Button |
| 90 | GroupDetail / CreateGroupModal |
| 95 | OnboardingModal, PlayerProfileCard |
| 98 | LoginModal |
| 100 | VerificationBanner |
| 200 | Toast |

## Lobby-Hopping-Schutz
```
Beitritt → [60s Lock] → Verlassen → [45s Cooldown] → Neuer Beitritt
```
- `LEAVE_BLOCK_MS = 60_000`, `JOIN_BLOCK_MS = 45_000`
- `_leftAt: Map<userId, timestamp>` — in-memory, kein Firestore
- Mock-Member `joinedAt: 0` → kein Cooldown

## Firestore-Subscription-Architektur
```
subscribeToLobbies(cb) → onSnapshot(collection) → LfgFeed
subscribeLobby(id, cb) → onSnapshot(doc)         → LobbyDetail
seedIfEmpty()          → getDocs → addDoc         → einmalig App-Start
```
CRUD: `createLobby`, `joinLobby`, `leaveLobby`, `setReady` — alle `async`. Doc-ID = lobbyId (kein `lobbyId`-Feld im Dokument).

## Was wir bewusst NICHT übernehmen (OSS-Analyse)
| Pattern | Warum nicht |
|---|---|
| Authoritative Server-Logic (Colyseus) | Kein Gameserver — kein Anti-Cheat nötig |
| Binäre Diffs / MsgPack | Firestore macht Deltas intern |
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
