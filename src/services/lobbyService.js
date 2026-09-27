import { supabase, must, liveQuery, isUuid } from './supabase'
import { sanitizeText } from '../utils/sanitize'

export const RANK_OPTIONS = ['Keine', 'Bronze', 'Silber', 'Gold', 'Platin', 'Diamant', 'Radiant']

export const LANGUAGE_OPTIONS = [
  { value: 'de',  label: 'Deutsch' },
  { value: 'en',  label: 'English' },
  { value: 'any', label: 'Egal'    },
]

// Muss zu den Werten in supabase/migrations/*_lobby_rpc.sql passen (Server ist maßgeblich)
const LEAVE_BLOCK_MS = 60 * 1000
const JOIN_BLOCK_MS  = 45 * 1000

// Nur für den Live-Countdown in der UI; durchgesetzt wird der Cooldown serverseitig
const _leftAt = new Map() // userId → timestamp (ms)

const LOBBY_SELECT = `
  id, host_id, game, game_category, title, description, max_slots, requires_mic, language,
  min_rank, platform, region, mode, gender, min_age, join_code, created_at, expires_at, all_ready_at,
  host:profiles!host_id(username),
  lobby_members(user_id, is_ready, joined_at, profile:profiles(username))
`

function toLobby(r) {
  const members = [...(r.lobby_members ?? [])]
    .sort((a, b) => (a.joined_at < b.joined_at ? -1 : a.joined_at > b.joined_at ? 1 : 0))
    .map(m => ({
      userId:   m.user_id,
      username: m.profile?.username ?? '',
      isReady:  m.is_ready,
      joinedAt: Date.parse(m.joined_at),
    }))
  return {
    lobbyId:      r.id,
    game:         r.game,
    gameCategory: r.game_category,
    title:        r.title,
    description:  r.description,
    maxSlots:     r.max_slots,
    requiresMic:  r.requires_mic,
    language:     r.language,
    minRank:      r.min_rank,
    platform:     r.platform,
    region:       r.region,
    mode:         r.mode,
    gender:       r.gender,
    minAge:       r.min_age,
    members,
    createdBy:    { userId: r.host_id, username: r.host?.username ?? '' },
    joinCode:     r.join_code,
    createdAt:    r.created_at,
    expiresAt:    r.expires_at,
    allReadyAt:   r.all_ready_at,
  }
}

async function fetchLobby(lobbyId) {
  if (!isUuid(lobbyId)) return null
  const row = must(await supabase.from('lobbies').select(LOBBY_SELECT).eq('id', lobbyId).maybeSingle())
  return row ? toLobby(row) : null
}

async function rpc(fn, args) {
  return must(await supabase.rpc(fn, args))
}

// Demo-Lobbys, falls keine einzige Lobby existiert (Aufbauphase)
export async function seedIfEmpty() {
  const { data } = await supabase.auth.getSession()
  if (!data.session) return
  await rpc('seed_demo_lobbies')
}

// Echtzeit-Abo für alle Lobbys — gibt unsubscribe zurück. Abgelaufene filtert RLS, löscht pg_cron.
export function subscribeToLobbies(callback) {
  return liveQuery(
    [{ table: 'lobbies' }, { table: 'lobby_members' }],
    getAllLobbies,
    callback,
  )
}

// Echtzeit-Abo für eine einzelne Lobby — callback(null) wenn gelöscht
export function subscribeLobby(lobbyId, callback) {
  return liveQuery(
    [{ table: 'lobbies' }, { table: 'lobby_members' }],
    () => fetchLobby(lobbyId),
    callback,
  )
}

export async function findLobbyByCode(code) {
  const row = must(await supabase
    .from('lobbies')
    .select(LOBBY_SELECT)
    .eq('join_code', code.toUpperCase().trim())
    .maybeSingle())
  return row ? toLobby(row) : null
}

export async function getAllLobbies() {
  const rows = must(await supabase
    .from('lobbies')
    .select(LOBBY_SELECT)
    .order('created_at', { ascending: false }))
  return rows.map(toLobby)
}

export function isLobbyFull(lobby) {
  return lobby.members.length >= lobby.maxSlots
}

export async function getUserLobby(userId) {
  if (!isUuid(userId)) return null
  const row = must(await supabase
    .from('lobby_members')
    .select('lobby_id, lobbies!inner(expires_at)')
    .eq('user_id', userId)
    .maybeSingle())
  return row ? fetchLobby(row.lobby_id) : null
}

// Verbleibende ms, bis der User einer neuen Lobby beitreten darf (UI-Countdown)
export function joinBlockMs(userId) {
  const left = _leftAt.get(userId)
  if (!left) return 0
  return Math.max(0, JOIN_BLOCK_MS - (Date.now() - left))
}

// Verbleibende ms, bis der User seine aktuelle Lobby verlassen darf (UI-Countdown)
export function leaveBlockMs(lobby, userId) {
  const member = lobby?.members.find(m => m.userId === userId)
  if (!member?.joinedAt) return 0
  return Math.max(0, LEAVE_BLOCK_MS - (Date.now() - member.joinedAt))
}

export async function createLobby(
  { game, gameCategory, title, description, maxSlots, requiresMic, language, minRank,
    platform, region, mode, gender, minAge },
) {
  const id = await rpc('create_lobby', {
    p_game:          sanitizeText(game, 50),
    p_game_category: gameCategory ?? 'other',
    p_title:         sanitizeText(title, 80),
    p_description:   sanitizeText(description, 200),
    p_max_slots:     parseInt(maxSlots) || 5,
    p_requires_mic:  Boolean(requiresMic),
    p_language:      language ?? 'de',
    p_min_rank:      minRank ?? null,
    p_platform:      platform ?? 'crossplay',
    p_region:        region ?? 'eu',
    p_mode:          mode ?? 'casual',
    p_gender:        gender ?? 'any',
    p_min_age:       Number(minAge) || 0,
  })
  return fetchLobby(id)
}

export async function joinLobby(lobbyId) {
  await rpc('join_lobby', { p_lobby: lobbyId })
  return fetchLobby(lobbyId)
}

export async function dissolveLobby(lobbyId) {
  await rpc('dissolve_lobby', { p_lobby: lobbyId })
}

export async function kickMember(lobbyId, hostUserId, targetUserId) {
  await rpc('kick_member', { p_lobby: lobbyId, p_user: targetUserId })
}

export async function leaveLobby(lobbyId, userId) {
  await rpc('leave_lobby', { p_lobby: lobbyId })
  _leftAt.set(userId, Date.now())
}

// Letzte 100 Nachrichten, aufsteigend sortiert (nur für Mitglieder lesbar)
export function subscribeChat(lobbyId, callback) {
  if (!isUuid(lobbyId)) { callback([]); return () => {} }
  const fetchMessages = async () => {
    const rows = must(await supabase
      .from('lobby_messages')
      .select('id, user_id, username, text, created_at')
      .eq('lobby_id', lobbyId)
      .order('created_at', { ascending: false })
      .limit(100))
    return rows.reverse().map(m => ({ id: m.id, userId: m.user_id, username: m.username, text: m.text, at: m.created_at }))
  }
  return liveQuery([{ table: 'lobby_messages', filter: `lobby_id=eq.${lobbyId}` }], fetchMessages, callback)
}

export async function sendMessage(lobbyId, user, text) {
  const clean = sanitizeText(text, 300)
  if (!clean) return
  must(await supabase.from('lobby_messages').insert({ lobby_id: lobbyId, text: clean }))
}

export async function setReady(lobbyId, userId, isReady) {
  await rpc('set_ready', { p_lobby: lobbyId, p_ready: isReady })
  return fetchLobby(lobbyId)
}
