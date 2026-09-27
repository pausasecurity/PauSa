# PAUSA — Design System

## Color Strategy: Committed
Bordeaux (`#9B1631`) carries the functional surface. Navy (`#1A2744`) provides structural anchoring. Neither is decorative.

## Palette
| Token       | Value       | Role                                      |
|-------------|-------------|-------------------------------------------|
| bordeaux    | `#9B1631`   | CTA, Ready-Toggle, featured stripe, focus |
| bordeaux-dark | `#7B0D1E` | Hover dark state                          |
| bordeaux-light | `#B52240` | Button hover                             |
| bordeaux-tint | `#9B163118` | Active chip BG                          |
| navy        | `#1A2744`   | SA logo, Avatar BG, standard stripe       |
| navy-light  | `#2E3F62`   | Avatar border, hover state                |
| navy-tint   | `#8BA3D4`   | Text on navy, game tags, secondary icons  |
| navy-subtle | `#1A274440` | Tag backgrounds                           |
| gold        | `#C9A84C`   | Slogan only — nowhere else                |
| bg-950      | `#0E0E0F`   | App background                            |
| bg-900      | `#1A1A1C`   | Navbar, cards, modals                     |
| surface     | `#27272A`   | Active nav item, input hover              |
| line        | `#3F3F46`   | All borders and dividers                  |
| muted       | `#A1A1AA`   | Inactive nav, secondary text              |
| subtle      | `#71717A`   | Descriptions, subtext                     |
| dim         | `#555555`   | Labels, timestamps                        |
| primary     | `#FAFAFA`   | Primary text                              |

## Typography
| Role        | Font            | Size       | Weight |
|-------------|-----------------|------------|--------|
| Hero        | Syne            | 42px       | 700    |
| Headings    | Syne            | 22px       | 700    |
| Card title  | DM Sans         | 13px       | 500    |
| Body        | DM Sans         | 14–15px    | 400    |
| Label/Tag   | DM Sans         | 10–11px    | 500    |
| Slogan      | DM Sans Italic  | 10/18px    | 400    |
| Mono        | System mono     | contextual | 400    |

## Design Dials
- DESIGN_VARIANCE: 6
- MOTION_INTENSITY: 5
- VISUAL_DENSITY: 7

## Motion System
| Event         | Values                                                    |
|---------------|-----------------------------------------------------------|
| Enter         | opacity 0→1, y 8→0, ease `[0.23, 1, 0.32, 1]`, 180–200ms |
| Exit          | opacity 1→0, scale 1→0.95, 120–150ms                     |
| Stagger       | 50–60ms between items, cap at 300ms total                 |
| Spring        | stiffness 400, damping 30, no bounce                      |
| Hover         | 150ms ease-out, border-color / background only            |
| Active/press  | scale 0.97, 100ms ease-out                                |
| Drawer        | cubic-bezier(0.32, 0.72, 0, 1) — iOS-like                |

## Component Specs
- Cards: bg-900, 1px border line, radius 10px, top-stripe 2px
- Modals: bg-900, 0.5px border line, radius 10px, pad 24px
- Navbar: bg-900, border-bottom 0.5px line, height 56px
- Inputs: bg-950 bg, border line, focus-border bordeaux
- Touch targets: min 44px always

## Absolute Bans
- Side-stripe accent borders > 1px
- Gradient text (`background-clip: text`)
- Decorative glassmorphism
- Bounce or elastic spring easing
- `ease-in` on any UI element
- Emojis — SVG only
- Em dashes in copy
