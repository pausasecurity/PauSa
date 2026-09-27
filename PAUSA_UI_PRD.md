# PAUSA — UI/Design PRD

> Stand: Mai 2026 — Brainstorm-Phase abgeschlossen

---

## 1. Design-Philosophie

- Dark-first, Gaming-Ästhetik — dicht, klar, kein generischer SaaS-Look
- Bordeaux als unverwechselbarer Primär-Accent (kein Discord-Blau, kein Lila)
- taste-skill Dials: `DESIGN_VARIANCE: 6 / MOTION_INTENSITY: 5 / VISUAL_DENSITY: 7`
- Anti-Slop-Regeln (impeccable): kein nested card, kein Inter + purple gradient, Touch-Targets ≥ 44px

---

## 2. Farb-System

### Primär — Bordeaux
| Token | Hex | Verwendung |
|---|---|---|
| `bordeaux-dark` | `#7B0D1E` | Hover-Zustand (dunkel) |
| `bordeaux` | `#9B1631` | CTA, Ready-Toggle, Accent-Border, Logo „PAU" |
| `bordeaux-light` | `#B52240` | Button-Hover |
| `bordeaux-tint` | `#9B163118` | Chip-Background aktiv |

### Sekundär — Navy
| Token | Hex | Verwendung |
|---|---|---|
| `navy` | `#1A2744` | Logo „SA", Avatar-BG, Card-Stripe sekundär |
| `navy-light` | `#2E3F62` | Avatar-Border, Card-Stripe hover |
| `navy-tint` | `#8BA3D4` | Text auf Navy-BG, Game-Tags, Icons |
| `navy-subtle` | `#1A274440` | Tag-Hintergrund |

### Akzent — Gold (Slogan)
| Token | Hex | Verwendung |
|---|---|---|
| `gold` | `#C9A84C` | Slogan „find your squad" — nur dort |

### Neutrale Basis
| Token | Hex | Verwendung |
|---|---|---|
| `bg-950` | `#0E0E0F` | App-Hintergrund, Screen-BG |
| `bg-900` | `#1A1A1C` | Navbar, Cards, Modals |
| `surface` | `#27272A` | Active Nav-Link, Input-BG hover |
| `border` | `#3F3F46` | Cards, Inputs, Divider |
| `text-muted` | `#A1A1AA` | Sekundärer Text, Nav-Links inaktiv |
| `text-subtle` | `#71717A` | Hero-Subtext, Descriptions |
| `text-dim` | `#555555` | Labels, Timestamps |
| `text-primary` | `#FAFAFA` | Primärer Text |

---

## 3. Typografie

### Schriften
| Rolle | Font | Weight | Quelle |
|---|---|---|---|
| Logo, Headings, Hero-Titel | **Syne** | 700 | Google Fonts |
| Body, Nav, Buttons, Labels | **DM Sans** | 400 / 500 | Google Fonts |
| Slogan | **DM Sans Italic** | 400 | Google Fonts |
| Rang-Badges, Codes, Timer | Monospace (system) | 400 | — |

### Skala
| Ebene | Font | Size | Weight |
|---|---|---|---|
| Hero-Titel | Syne | 42px | 700 |
| Section-Heading | Syne | 22px | 700 |
| Card-Titel | DM Sans | 13px | 500 |
| Body | DM Sans | 14–15px | 400 |
| Label / Tag | DM Sans | 10–11px | 500 |
| Slogan | DM Sans Italic | 10px (Navbar) / 18px (Hero) | 400 |

---

## 4. Logo & Slogan

### Logo-Platzhalter
```
PAU  →  Syne Bold, #9B1631 (Bordeaux)
SA   →  Syne Bold, #1A2744 (Navy)
```
- Klickbar → `navigate('/')`
- Später ersetzen durch `logo.svg` (gleiche Position, gleiche Größe)

### Slogan
```
find your squad
```
- Font: DM Sans Italic
- Farbe: `#C9A84C` (Gold)
- Kein Gedankenstrich davor
- **Navbar:** unter Logo, 10px, `letter-spacing: 0.06em`
- **Hero:** als Zwischenzeile nach Titel, 18px

---

## 5. Komponenten-Spec

### Navbar
- Höhe: 56px
- BG: `#1A1A1C`, Border: `0.5px solid #3F3F46`
- Links: DM Sans 13px, inaktiv `#A1A1AA`, aktiv `#FAFAFA` + BG `#27272A`
- Rechts: `+ Lobby` Button (Bordeaux) + Avatar-Circle (Navy)
- Logo-Block: Logo-Text + Slogan darunter, linksbündig

### LobbyCard
Priorität der Infos (Reihenfolge):
1. Game-Tag (Navy-Tint, `#8BA3D4`, BG `#1A274440`)
2. Lobby-Titel (13px, 500, `#FAFAFA`)
3. Slot-Dots (gefüllt = `#9B1631`, leer = `#3F3F46`)
4. Rang-Pill (Monospace, Navy-Tint BG)

- Top-Stripe: 2px — Bordeaux für featured, Navy für standard
- Hover: `border-color: #9B1631`
- Featured-Card: `border-color: #9B163155`

### Hero (nicht eingeloggt)
- Layout: asymmetrisch — Text links, Mini-LobbyCards rechts (210px)
- Eyebrow: `#9B1631`, 11px, uppercase, letter-spacing
- Titel: Syne 42px Bold
- Slogan: DM Sans Italic 18px, Gold, kein Gedankenstrich
- Subtext: 14px, `#71717A`
- CTA primär: „Jetzt loslegen" → Login-Modal öffnen
- CTA sekundär: „Lobbys ansehen" → Scroll zu LfgFeed
- Stats-Row: border-top Divider, Syne Bold für Zahlen

### Modals (Login + CreateLobby)
- BG: `#1A1A1C`, Border: `0.5px solid #3F3F46`, Radius: 10px, Padding: 24px
- Input: BG `#0E0E0F`, Border `#3F3F46`, Focus-Border `#9B1631`
- CTA: volle Breite, Bordeaux, 13px 500
- Overlay: `#0E0E0F` mit Opacity

### Mobile
- Phone-Frame: Radius 28px, Notch-Pill, BG `#111113`
- Navbar mobile: Logo + Slogan links, Avatar rechts
- Bottom-Nav: 3 Items (Lobbys / Gruppen / Profil), aktiver Indicator = 2px Bordeaux-Line
- Drawer (CreateLobby via vaul): Slide-up, Handle-Pill, dunkles Backdrop

---

## 6. Bibliotheken & Tools

| Lib | Zweck | Status |
|---|---|---|
| `vaul` (emilkowalski) | MessagesPanel, FilterPanel, CreateLobby Mobile, PlayerProfileCard | Installieren Sprint 1 |
| `framer-motion` | Card→Detail-Transition (layoutId), staggered mounts, Ready-Toggle | Installieren Sprint 1 |
| `impeccable` (pbakaus) | Anti-Pattern-Audit nach jedem Sprint (`/audit`, `/polish`) | CLI, kein Dependency |
| taste-skill | Design-Referenz während Implementation | Referenz |

---

## 7. Sprint-Plan

### Sprint 1 — Foundation
- [ ] `vaul` + `framer-motion` installieren
- [ ] `src/data/tokens.js` — alle Farb- und Typografie-Tokens
- [ ] Navbar refactor: Logo-Block + Slogan, Syne/DM Sans
- [ ] `impeccable` CLI-Baseline-Scan

### Sprint 2 — LfgFeed + LobbyDetail
- [ ] LobbyCard Redesign (Stripe, Slot-Dots, Rang-Pill)
- [ ] Framer Motion `layoutId` Card→Detail-Transition
- [ ] FilterPanel als vaul-Drawer (Snap-Points)
- [ ] MessagesPanel Migration auf vaul

### Sprint 3 — Hero + Modals + Mobile
- [ ] Hero-Section (asymmetrisch, Stats-Row)
- [ ] Login-Modal + CreateLobby-Modal
- [ ] Mobile Bottom-Nav + vaul-Drawer CreateLobby
- [ ] `impeccable /polish` + `/typeset` pro Komponente

---

## 8. Offene Entscheidungen

| # | Frage | Status |
|---|---|---|
| O1 | Logo-Asset — wann kommt die finale SVG? | Offen |
| O2 | Hero-BG — reines `#0E0E0F` oder subtile Textur/Noise? | Offen |
| O3 | Game-Cover-Arts als Card-BG (gefaded)? | Offen |
