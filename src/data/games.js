// Spielkatalog für Onboarding-Multiselect und Filter
export const GAMES = [
  // Shooter
  { id: 'val',    label: 'Valorant',               category: 'shooter',       ageRating: 16 },
  { id: 'cs2',    label: 'CS2',                    category: 'shooter',       ageRating: 16 },
  { id: 'r6',     label: 'Rainbow Six Siege',      category: 'shooter',       ageRating: 18 },
  { id: 'ow2',    label: 'Overwatch 2',            category: 'shooter',       ageRating: 12 },
  { id: 'dest2',  label: 'Destiny 2',              category: 'shooter',       ageRating: 16 },
  { id: 'bf2042', label: 'Battlefield 2042',       category: 'shooter',       ageRating: 18 },
  // Battle Royale
  { id: 'apex',   label: 'Apex Legends',           category: 'battle-royale', ageRating: 16 },
  { id: 'fort',   label: 'Fortnite',               category: 'battle-royale', ageRating: 12 },
  { id: 'pubg',   label: 'PUBG',                   category: 'battle-royale', ageRating: 16 },
  { id: 'wz',     label: 'Warzone',                category: 'battle-royale', ageRating: 18 },
  // MOBA
  { id: 'lol',    label: 'League of Legends',      category: 'moba',          ageRating: 12 },
  { id: 'dota2',  label: 'Dota 2',                 category: 'moba',          ageRating: 12 },
  { id: 'smite',  label: 'Smite 2',                category: 'moba',          ageRating: 12 },
  { id: 'hots',   label: 'Heroes of the Storm',    category: 'moba',          ageRating: 12 },
  // MMO / RPG
  { id: 'wow',    label: 'World of Warcraft',      category: 'mmo',           ageRating: 12 },
  { id: 'ff14',   label: 'Final Fantasy XIV',      category: 'mmo',           ageRating: 12 },
  { id: 'eso',    label: 'Elder Scrolls Online',   category: 'mmo',           ageRating: 16 },
  { id: 'gw2',    label: 'Guild Wars 2',           category: 'mmo',           ageRating: 12 },
  // Pen & Paper
  { id: 'dnd5e',  label: 'D&D 5e',                 category: 'pen-and-paper', ageRating: 12 },
  { id: 'pf2e',   label: 'Pathfinder 2e',          category: 'pen-and-paper', ageRating: 12 },
  { id: 'sr6',    label: 'Shadowrun 6e',           category: 'pen-and-paper', ageRating: 16 },
  { id: 'coc',    label: 'Call of Cthulhu',        category: 'pen-and-paper', ageRating: 16 },
  { id: 'vtm',    label: 'Vampire: The Masquerade',category: 'pen-and-paper', ageRating: 18 },
  { id: 'sw',     label: 'Star Wars RPG',          category: 'pen-and-paper', ageRating: 12 },
  // Sonstige
  { id: 'mc',     label: 'Minecraft',              category: 'other',         ageRating: 6  },
  { id: 'rust',   label: 'Rust',                   category: 'other',         ageRating: 16 },
  { id: 'gtao',   label: 'GTA Online',             category: 'other',         ageRating: 18 },
  { id: 'elden',  label: 'Elden Ring',             category: 'other',         ageRating: 16 },
]

export const CATEGORY_ORDER = [
  { key: 'shooter',       label: 'Shooter'        },
  { key: 'battle-royale', label: 'Battle Royale'  },
  { key: 'moba',          label: 'MOBA'           },
  { key: 'mmo',           label: 'MMO / RPG'      },
  { key: 'pen-and-paper', label: 'Pen & Paper'    },
  { key: 'other',         label: 'Sonstige'       },
]
