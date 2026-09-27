// Shared constants used across multiple components

export const PLATFORM_META = {
  steam:    { label: 'Steam',       color: 'border-blue-700/60 text-blue-400',   placeholder: 'Steam-Username'     },
  epic:     { label: 'Epic Games',  color: 'border-gray-600/60 text-gray-300',   placeholder: 'Epic-Anzeigename'   },
  psn:      { label: 'PlayStation', color: 'border-blue-500/60 text-blue-300',   placeholder: 'PSN-ID'             },
  xbox:     { label: 'Xbox',        color: 'border-green-700/60 text-green-400', placeholder: 'Gamertag'           },
  nintendo: { label: 'Nintendo',    color: 'border-red-700/60 text-red-400',     placeholder: 'SW-XXXX-XXXX-XXXX' },
}

export const TIER_COLORS = {
  'Iron':        'text-gray-400',
  'Bronze':      'text-amber-700',
  'Silver':      'text-gray-300',
  'Gold':        'text-yellow-400',
  'Platinum':    'text-cyan-300',
  'Diamond':     'text-blue-300',
  'Master':      'text-purple-400',
  'Grandmaster': 'text-red-400',
  'Challenger':  'text-yellow-200',
}

export const PLATFORM_ICONS = {
  steam:    { label: 'Steam',    color: 'bg-[#1b2838] border-[#4c6b8a]/50 text-[#c6d4df]' },
  psn:      { label: 'PSN',      color: 'bg-[#003087] border-[#0070d1]/50 text-[#89b4f8]' },
  xbox:     { label: 'Xbox',     color: 'bg-[#107c10] border-[#52b043]/50 text-[#9bf99b]' },
  epic:     { label: 'Epic',     color: 'bg-[#2a2a2a] border-[#555]/50 text-[#d4d4d4]'   },
  nintendo: { label: 'Nintendo', color: 'bg-[#e4000f] border-[#ff4444]/50 text-white'     },
}
