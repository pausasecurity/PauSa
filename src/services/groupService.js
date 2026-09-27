// ============================================================
// GROUP SERVICE – Modul 11 (Clan-Evolution)
// ============================================================

// ---- ROLLEN ----
// Gruppen:  owner → member (+ gm für P&P)
// Clans:    leader → officer → member
export const GROUP_ROLES = Object.freeze({
  // Gruppe
  OWNER:   'owner',
  GM:      'gm',
  // Clan (owner wird zu leader bei Konvertierung)
  LEADER:  'leader',
  OFFICER: 'officer',
  // Universal
  MEMBER:  'member',
})

// Welche Rollen dürfen in einem Clan Ankündigungen posten / Member verwalten
export const CLAN_ADMIN_ROLES = [GROUP_ROLES.LEADER, GROUP_ROLES.OFFICER]

export const MIN_CLAN_MEMBERS = 5   // Empfehlung; erzwingbar mit force=true

export const GAME_CATEGORIES = Object.freeze({
  'pen-and-paper': { label: 'Pen & Paper',   color: 'border-amber-600/60 text-amber-400'    },
  'shooter':       { label: 'Shooter',        color: 'border-red-700/60 text-red-400'        },
  'moba':          { label: 'MOBA',           color: 'border-blue-600/60 text-blue-400'      },
  'mmo':           { label: 'MMO',            color: 'border-purple-600/60 text-purple-400'  },
  'battle-royale': { label: 'Battle Royale',  color: 'border-yellow-600/60 text-yellow-400' },
  'other':         { label: 'Sonstige',       color: 'border-gray-600/60 text-gray-400'      },
})

// ---- DATENMODELL ----
// Gemeinsame Felder (group & clan):
//   groupId, name, type, gameType, category, members[], maxMembers,
//   isPermanent, nextSession, description, isPrivate, requires16, createdAt
//
// Clan-exklusive Felder:
//   clanTag (2–4 Zeichen), motto, announcements[]
//   announcements: [{ id, authorId, authorName, text, postedAt }]

// Mock-User für Demo (entspricht mockProfile in App.jsx)
export const MOCK_CURRENT_USER = { userId: 'u2', username: 'ShadowWolf_99', isVerified: true }

// Invite-Token-Store (token → groupId)
const _inviteTokens = {}

// User-Einladungen (in-memory)
const _invites = [
  // Demo-Einladungen für MOCK_CURRENT_USER (u2)
  {
    inviteId: 'inv-demo-1', groupId: 'grp-001', groupName: 'Die Vergessenen Lande', groupType: 'group',
    fromUserId: 'u1', fromUsername: 'MagisterVex', toUserId: 'u2', toUsername: 'ShadowWolf_99',
    status: 'pending', sentAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  },
  {
    inviteId: 'inv-demo-2', groupId: 'grp-003', groupName: 'Pathfinder Society – EU West', groupType: 'group',
    fromUserId: 'u9', fromUsername: 'ArcaneHunter', toUserId: 'u2', toUsername: 'ShadowWolf_99',
    status: 'pending', sentAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
  },
]

// Hilfsfunktion: Darf der User Mitglieder verwalten (Anfragen annehmen/ablehnen)?
export function canManageMembers(group, userId) {
  const role = getMemberRole(group, userId)
  if (!role) return false
  if (group.type === 'clan') return CLAN_ADMIN_ROLES.includes(role)
  return role === GROUP_ROLES.OWNER || role === GROUP_ROLES.GM
}

let _groups = [
  // --- Clan (bereits konvertiert) ---
  {
    groupId:       'grp-002',
    type:          'clan',
    name:          'NightHawk Esports',
    clanTag:       'NHE',
    motto:         'Dominate. Adapt. Win.',
    gameType:      'Valorant',
    category:      'shooter',
    members: [
      { userId: 'u4', username: 'NightHawk_X', role: GROUP_ROLES.LEADER,  joinedAt: '2026-01-15' },
      { userId: 'u5', username: 'PhantomAce',  role: GROUP_ROLES.OFFICER, joinedAt: '2026-01-16' },
      { userId: 'u6', username: 'Vortex_EU',   role: GROUP_ROLES.MEMBER,  joinedAt: '2026-02-01' },
      { userId: 'u7', username: 'CrimsonDawn', role: GROUP_ROLES.MEMBER,  joinedAt: '2026-02-10' },
      { userId: 'u2', username: 'ShadowWolf_99', role: GROUP_ROLES.MEMBER, joinedAt: '2026-04-01' },
    ],
    maxMembers:    8,
    isPermanent:   true,
    nextSession:   '2026-05-07T20:30:00',
    description:   'Kompetitiver Clan, Diamond+ only. Suchen einen IGL. Scrims jeden Di/Do.',
    announcements: [
      {
        id:         'ann-001',
        authorId:   'u4',
        authorName: 'NightHawk_X',
        text:       'Scrim gegen TeaM_Chaos am Freitag 20:00 Uhr – alle pflichtmäßig anwesend!',
        postedAt:   '2026-05-05T15:30:00',
      },
      {
        id:         'ann-002',
        authorId:   'u5',
        authorName: 'PhantomAce',
        text:       'Neue Map-Rotation: Ascent und Pearl priorisieren. VOD-Reviews Di 19:00.',
        postedAt:   '2026-05-03T11:00:00',
      },
    ],
    isPrivate:     false,
    requires16:    true,
    joinRequests:  [],
    createdAt:     '2026-01-15',
  },

  // --- Gruppe mit Demo-Beitrittsanfragen (Owner = MOCK_CURRENT_USER) ---
  {
    groupId:     'grp-004',
    type:        'group',
    name:        'Phantom Wolves',
    gameType:    'CS2',
    category:    'shooter',
    members: [
      { userId: 'u2',  username: 'ShadowWolf_99', role: GROUP_ROLES.OWNER,  joinedAt: '2026-04-10' },
      { userId: 'u10', username: 'StealthByte',   role: GROUP_ROLES.MEMBER, joinedAt: '2026-04-11' },
      { userId: 'u11', username: 'GhostRifle',    role: GROUP_ROLES.MEMBER, joinedAt: '2026-04-12' },
    ],
    maxMembers:  5,
    isPermanent: true,
    nextSession: '2026-05-09T21:00:00',
    description: 'Aufstrebendes CS2-Team, sucht 2 Spieler für feste Runden. FaceIt Level 7+.',
    isPrivate:   true,
    requires16:  true,
    joinRequests: [
      { userId: 'u13', username: 'PixelSniper',  message: 'FaceIt Lvl 9, Main-AWPer, suche feste Runde.',      timestamp: '2026-05-05T14:22:00', status: 'pending' },
      { userId: 'u14', username: 'NovaBurst',    message: 'Entry-Fragger, 2000h+, verfügbar Di–Sa ab 20 Uhr.', timestamp: '2026-05-06T08:10:00', status: 'pending' },
    ],
    createdAt:   '2026-04-10',
  },

  // --- Offene Gruppen ---
  {
    groupId:     'grp-001',
    type:        'group',
    name:        'Die Vergessenen Lande',
    gameType:    'D&D 5e',
    category:    'pen-and-paper',
    members: [
      { userId: 'u1', username: 'MagisterVex',   role: GROUP_ROLES.GM,     joinedAt: '2026-03-01' },
      { userId: 'u3', username: 'IronClad_X',    role: GROUP_ROLES.MEMBER, joinedAt: '2026-03-03' },
      { userId: 'u8', username: 'RuneScribe',    role: GROUP_ROLES.MEMBER, joinedAt: '2026-03-10' },
    ],
    maxMembers:  6,
    isPermanent: true,
    nextSession: '2026-05-10T19:00:00',
    description: 'Eine düstere Homebrew-Kampagne in einer sterbenden Welt. Wir suchen 2 erfahrene Spieler für eine laufende Runde (Lvl 7). RP-Fokus, kein Min-Maxing.',
    isPrivate:   false,
    requires16:  true,
    joinRequests: [],
    createdAt:   '2026-03-01',
  },
  {
    groupId:     'grp-003',
    type:        'group',
    name:        'Pathfinder Society – EU West',
    gameType:    'Pathfinder 2e',
    category:    'pen-and-paper',
    members: [
      { userId: 'u9',  username: 'ArcaneHunter', role: GROUP_ROLES.GM,     joinedAt: '2026-02-20' },
      { userId: 'u12', username: 'BladeOfDawn',  role: GROUP_ROLES.MEMBER, joinedAt: '2026-02-21' },
    ],
    maxMembers:  5,
    isPermanent: true,
    nextSession: '2026-05-12T18:00:00',
    description: 'Organisiertes Spiel nach offiziellem PFS-Regelwerk. Einsteiger willkommen – wir erklären alles. Online via Foundry VTT.',
    isPrivate:   false,
    requires16:  false,
    joinRequests: [],
    createdAt:   '2026-02-20',
  },
]

// ---- ABFRAGEN ----

export function getAllGroups()              { return [..._groups] }
export function getGroupsByCategory(cat)   { return _groups.filter(g => g.category === cat) }
export function getGroupById(id)           { return _groups.find(g => g.groupId === id) ?? null }
export function isGroupFull(group)         { return group.members.length >= group.maxMembers }

export function getMemberRole(group, userId) {
  return group.members.find(m => m.userId === userId)?.role ?? null
}

// ---- ERSTELLEN ----

// type: 'group' | 'clan'  (Clan-Gründung setzt clanTag + motto voraus)
export function createGroup(
  { name, type = 'group', gameType, category, maxMembers, nextSession, description, isPrivate, requires16, clanTag, motto },
  creator
) {
  if (requires16 && !creator.isVerified) {
    throw new Error('Altersverifizierung erforderlich.')
  }
  if (type === 'clan') {
    if (!clanTag || clanTag.length < 2 || clanTag.length > 4) {
      throw new Error('Clan-Tag muss 2–4 Zeichen lang sein.')
    }
  }

  const ownerRole = type === 'clan' ? GROUP_ROLES.LEADER : GROUP_ROLES.OWNER
  const base = {
    groupId:     `grp-${Date.now()}`,
    type,
    name,
    gameType,
    category:    category ?? 'other',
    members:     [{ userId: creator.userId, username: creator.username, role: ownerRole, joinedAt: new Date().toISOString() }],
    maxMembers:  maxMembers ?? 6,
    isPermanent:  true,
    nextSession:  nextSession ?? null,
    description:  description ?? '',
    isPrivate:    isPrivate ?? false,
    requires16:   requires16 ?? false,
    joinRequests: [],
    createdAt:    new Date().toISOString(),
  }
  const clan = type === 'clan'
    ? { clanTag: clanTag.toUpperCase(), motto: motto ?? '', announcements: [] }
    : {}

  _groups = [{ ...base, ...clan }, ..._groups]
  return _groups[0]
}

// ---- BEITRITT / AUSTRITT ----

export function joinGroup(groupId, user) {
  const group = getGroupById(groupId)
  if (!group)                                          throw new Error('Gruppe nicht gefunden.')
  if (isGroupFull(group))                              throw new Error('Gruppe ist bereits voll.')
  if (group.members.some(m => m.userId === user.userId)) throw new Error('Bereits Mitglied.')
  if (group.requires16 && !user.isVerified)            throw new Error('Altersverifizierung erforderlich.')

  _groups = _groups.map(g =>
    g.groupId === groupId
      ? { ...g, members: [...g.members, { userId: user.userId, username: user.username, role: GROUP_ROLES.MEMBER, joinedAt: new Date().toISOString() }] }
      : g
  )
  return getGroupById(groupId)
}

export function leaveGroup(groupId, userId) {
  _groups = _groups.map(g =>
    g.groupId === groupId ? { ...g, members: g.members.filter(m => m.userId !== userId) } : g
  )
}

// ---- CLAN-EVOLUTION ----

// Wirft { code: 'INSUFFICIENT_MEMBERS', current, required } wenn zu wenig Mitglieder und force=false.
export function convertToClan(groupId, requestorId, { clanTag, motto }, force = false) {
  const group = getGroupById(groupId)
  if (!group)                  throw new Error('Gruppe nicht gefunden.')
  if (group.type === 'clan')   throw new Error('Bereits ein Clan.')

  const requestor = group.members.find(m => m.userId === requestorId)
  if (!requestor || requestor.role !== GROUP_ROLES.OWNER) {
    throw new Error('Nur der Owner kann die Gruppe zum Clan aufwerten.')
  }
  if (!clanTag || clanTag.length < 2 || clanTag.length > 4) {
    throw new Error('Clan-Tag muss 2–4 Zeichen lang sein.')
  }

  if (!force && group.members.length < MIN_CLAN_MEMBERS) {
    const err = new Error(`Mindestens ${MIN_CLAN_MEMBERS} Mitglieder empfohlen (aktuell: ${group.members.length}).`)
    err.code    = 'INSUFFICIENT_MEMBERS'
    err.current  = group.members.length
    err.required = MIN_CLAN_MEMBERS
    throw err
  }

  _groups = _groups.map(g => {
    if (g.groupId !== groupId) return g
    return {
      ...g,
      type:          'clan',
      clanTag:       clanTag.toUpperCase(),
      motto:         motto ?? '',
      announcements: [],
      members:       g.members.map(m =>
        m.userId === requestorId ? { ...m, role: GROUP_ROLES.LEADER } : m
      ),
    }
  })
  return getGroupById(groupId)
}

// ---- CLAN-MANAGEMENT ----

export function addAnnouncement(groupId, userId, text) {
  const group = getGroupById(groupId)
  if (!group || group.type !== 'clan') throw new Error('Nur in Clans verfügbar.')

  const author = group.members.find(m => m.userId === userId)
  if (!author || !CLAN_ADMIN_ROLES.includes(author.role)) {
    throw new Error('Nur Leader und Officers können Ankündigungen posten.')
  }
  const announcement = {
    id:         `ann-${Date.now()}`,
    authorId:   userId,
    authorName: author.username,
    text:       text.trim(),
    postedAt:   new Date().toISOString(),
  }
  _groups = _groups.map(g =>
    g.groupId === groupId ? { ...g, announcements: [announcement, ...g.announcements] } : g
  )
  return announcement
}

export function promoteToOfficer(groupId, requestorId, targetUserId) {
  const group = getGroupById(groupId)
  if (!group || group.type !== 'clan') throw new Error('Nur in Clans verfügbar.')

  const requestor = group.members.find(m => m.userId === requestorId)
  if (!requestor || requestor.role !== GROUP_ROLES.LEADER) {
    throw new Error('Nur der Leader kann Officers ernennen.')
  }
  _groups = _groups.map(g =>
    g.groupId === groupId
      ? { ...g, members: g.members.map(m => m.userId === targetUserId ? { ...m, role: GROUP_ROLES.OFFICER } : m) }
      : g
  )
}

// ---- EINLADUNGEN ----

// Generiert einen deterministischen Pseudo-Invite-Link.
export function generateInviteLink(groupId) {
  const existing = Object.entries(_inviteTokens).find(([, gId]) => gId === groupId)
  if (existing) return `pausa.app/join/${existing[0]}`

  const token = `${groupId}-${Math.random().toString(36).slice(2, 8)}`
  _inviteTokens[token] = groupId
  return `pausa.app/join/${token}`
}

export function resolveInviteToken(token) {
  return _inviteTokens[token] ?? null
}

// ---- BEITRITTSANFRAGEN ----

// Offene Gruppe → direkter Beitritt. Private Gruppe oder Clan → joinRequest anlegen.
export function requestToJoin(groupId, user, message = '') {
  const group = getGroupById(groupId)
  if (!group)                                               throw new Error('Gruppe nicht gefunden.')
  if (group.members.some(m => m.userId === user.userId))   throw new Error('Bereits Mitglied.')
  if (group.requires16 && !user.isVerified)                throw new Error('Altersverifizierung erforderlich.')
  if ((group.joinRequests ?? []).some(r => r.userId === user.userId && r.status === 'pending')) {
    throw new Error('Anfrage bereits gestellt.')
  }

  const needsApproval = group.isPrivate || group.type === 'clan'

  if (!needsApproval) {
    // Direkt beitreten
    return joinGroup(groupId, user)
  }

  // Anfrage anlegen
  const req = {
    userId:    user.userId,
    username:  user.username,
    message:   message.trim(),
    timestamp: new Date().toISOString(),
    status:    'pending',
  }
  _groups = _groups.map(g =>
    g.groupId === groupId
      ? { ...g, joinRequests: [...(g.joinRequests ?? []), req] }
      : g
  )
  return { requested: true, groupId }
}

export function getPendingRequests(groupId) {
  return (getGroupById(groupId)?.joinRequests ?? []).filter(r => r.status === 'pending')
}

// Annehmen: User wird Member, Request → 'approved', Willkommensnachricht bei Clans.
export function approveJoinRequest(groupId, adminId, targetUserId) {
  const group = getGroupById(groupId)
  if (!group)                            throw new Error('Gruppe nicht gefunden.')
  if (!canManageMembers(group, adminId)) throw new Error('Keine Berechtigung.')
  if (isGroupFull(group))                throw new Error('Gruppe ist voll.')

  const req = (group.joinRequests ?? []).find(r => r.userId === targetUserId && r.status === 'pending')
  if (!req) throw new Error('Anfrage nicht gefunden.')

  _groups = _groups.map(g => {
    if (g.groupId !== groupId) return g
    return {
      ...g,
      members: [...g.members, { userId: req.userId, username: req.username, role: GROUP_ROLES.MEMBER, joinedAt: new Date().toISOString() }],
      joinRequests: g.joinRequests.map(r => r.userId === targetUserId ? { ...r, status: 'approved' } : r),
      // Willkommensnachricht als System-Ankündigung (nur Clans)
      ...(g.type === 'clan' ? {
        announcements: [{
          id:         `sys-${Date.now()}`,
          authorId:   'system',
          authorName: 'System',
          text:       `${req.username} ist dem Clan beigetreten! 👋`,
          isSystem:   true,
          postedAt:   new Date().toISOString(),
        }, ...g.announcements],
      } : {}),
    }
  })
}

// Ablehnen: Request → 'rejected'.
export function rejectJoinRequest(groupId, adminId, targetUserId) {
  const group = getGroupById(groupId)
  if (!group)                            throw new Error('Gruppe nicht gefunden.')
  if (!canManageMembers(group, adminId)) throw new Error('Keine Berechtigung.')

  _groups = _groups.map(g =>
    g.groupId === groupId
      ? { ...g, joinRequests: g.joinRequests.map(r => r.userId === targetUserId ? { ...r, status: 'rejected' } : r) }
      : g
  )
}

// ---- EINLADUNGEN (User-spezifisch) ----

export function sendInvite(groupId, fromUserId, toUserId, toUsername) {
  const group = getGroupById(groupId)
  if (!group) throw new Error('Gruppe nicht gefunden.')
  if (!canManageMembers(group, fromUserId)) throw new Error('Keine Berechtigung.')
  if (group.members.some(m => m.userId === toUserId)) throw new Error('Bereits Mitglied.')
  if (_invites.some(i => i.groupId === groupId && i.toUserId === toUserId && i.status === 'pending')) {
    throw new Error('Bereits eingeladen.')
  }
  const from = group.members.find(m => m.userId === fromUserId)
  const invite = {
    inviteId:    `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    groupId,
    groupName:   group.name,
    groupType:   group.type,
    fromUserId,
    fromUsername: from?.username ?? 'Unbekannt',
    toUserId,
    toUsername,
    status:      'pending',
    sentAt:      new Date().toISOString(),
  }
  _invites.push(invite)
  return invite
}

export function getPendingInvitesForUser(userId) {
  return _invites.filter(i => i.toUserId === userId && i.status === 'pending')
}

export function getPendingInvitesForGroup(groupId) {
  return _invites.filter(i => i.groupId === groupId && i.status === 'pending')
}

export function acceptInvite(inviteId, userId, username) {
  const invite = _invites.find(i => i.inviteId === inviteId && i.toUserId === userId && i.status === 'pending')
  if (!invite) throw new Error('Einladung nicht gefunden.')
  invite.status = 'accepted'
  const group = getGroupById(invite.groupId)
  if (!group) throw new Error('Gruppe nicht mehr vorhanden.')
  if (isGroupFull(group)) throw new Error('Gruppe ist bereits voll.')
  _groups = _groups.map(g =>
    g.groupId === invite.groupId
      ? { ...g, members: [...g.members, { userId, username: username ?? invite.toUsername, role: GROUP_ROLES.MEMBER, joinedAt: new Date().toISOString() }] }
      : g
  )
  return getGroupById(invite.groupId)
}

export function declineInvite(inviteId, userId) {
  const inv = _invites.find(i => i.inviteId === inviteId && i.toUserId === userId && i.status === 'pending')
  if (!inv) throw new Error('Einladung nicht gefunden.')
  inv.status = 'declined'
}

// PLACEHOLDER: transferOwnership, disbandGroup, kickMember, searchGroups
