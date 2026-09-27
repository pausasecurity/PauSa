import React, { useState } from 'react'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import {
  GAME_CATEGORIES, GROUP_ROLES, CLAN_ADMIN_ROLES,
  addAnnouncement, canManageMembers,
  requestToJoin, approveJoinRequest, rejectJoinRequest,
  generateInviteLink, getPendingRequests,
  sendInvite, getPendingInvitesForGroup,
  leaveGroup,
} from '../services/groupService'
import { timeAgo } from '../utils/timeAgo'
import { MOCK_PLAYERS } from '../data/mockPlayers'
import { useAuth } from '../context/AuthContext'
import { useVerification } from '../context/VerificationContext'
import PlayerProfileCard from './PlayerProfileCard'
import DoubleConfirm from './shared/DoubleConfirm'
import ReportModal from './ReportModal'

const ROLE_LABELS = {
  [GROUP_ROLES.LEADER]:  'Leader',
  [GROUP_ROLES.OFFICER]: 'Officer',
  [GROUP_ROLES.GM]:      'GM',
  [GROUP_ROLES.OWNER]:   'Owner',
  [GROUP_ROLES.MEMBER]:  'Member',
}

const AVATAR_COLOR = {
  [GROUP_ROLES.LEADER]:  'bg-gradient-to-br from-yellow-500 to-amber-600',
  [GROUP_ROLES.OFFICER]: 'bg-gradient-to-br from-blue-500 to-blue-700',
  [GROUP_ROLES.GM]:      'bg-gradient-to-br from-amber-500 to-orange-600',
  [GROUP_ROLES.OWNER]:   'bg-gradient-to-br from-purple-500 to-brand-secondary',
  [GROUP_ROLES.MEMBER]:  'bg-gradient-to-br from-brand-primary to-brand-secondary',
}

const ROLE_BADGE_COLOR = {
  [GROUP_ROLES.LEADER]:  'border-yellow-600/50 text-yellow-400',
  [GROUP_ROLES.OFFICER]: 'border-blue-600/50 text-blue-300',
  [GROUP_ROLES.GM]:      'border-amber-600/50 text-amber-400',
  [GROUP_ROLES.OWNER]:   'border-purple-600/50 text-purple-300',
  [GROUP_ROLES.MEMBER]:  'border-gray-700/50 text-gray-500',
}

function formatFull(iso) {
  if (!iso) return '–'
  return new Date(iso).toLocaleString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
}

// ---- ChatWindow-Platzhalter ----
function ChatWindow({ group }) {
  const systemMessages = (group.announcements ?? []).filter(a => a.isSystem)
  return (
    <section>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">💬 Gruppen-Chat</p>
      <div className="bg-brand-dark/50 border border-purple-900/30 rounded-xl overflow-hidden">
        <div className="min-h-[80px] px-4 py-3 space-y-2">
          {/* System-Beitrittsmeldungen aus dem announcements-Array */}
          {systemMessages.map(msg => (
            <p key={msg.id} className="text-xs text-gray-500 italic text-center">
              ⚙ {msg.text}
            </p>
          ))}
          {systemMessages.length === 0 && (
            <p className="text-xs text-gray-700 italic text-center pt-4">Noch keine Nachrichten.</p>
          )}
          {/* PLACEHOLDER: WebSocket-Hook, MessageList, Auto-Scroll-Ref */}
        </div>
        <div className="border-t border-purple-900/30 px-3 py-2 flex items-center gap-2">
          <input
            disabled
            placeholder="Nachricht schreiben… (coming soon)"
            className="flex-1 bg-transparent text-sm text-gray-600 focus:outline-none cursor-not-allowed"
          />
          {/* PLACEHOLDER: Send-Button, Emoji-Picker, File-Upload */}
        </div>
      </div>
    </section>
  )
}

// ---- Beitrittsanfragen-Panel (Admins) ----
function JoinRequestsPanel({ group, onUpdate, currentUserId }) {
  const [actionError, setActionError] = useState(null)
  const pending = getPendingRequests(group.groupId)

  if (pending.length === 0) return null

  const handle = (fn, targetId) => {
    setActionError(null)
    try { fn(group.groupId, currentUserId, targetId); onUpdate?.() }
    catch (e) { setActionError(e.message) }
  }

  return (
    <section>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
        📥 Beitrittsanfragen
        <span className="ml-2 bg-brand-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
          {pending.length}
        </span>
      </p>
      <div className="space-y-2">
        {pending.map(req => (
          <div key={req.userId} className="bg-brand-dark/50 border border-purple-900/30 rounded-xl px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{req.username}</p>
                {req.message && (
                  <p className="text-xs text-gray-400 mt-1 italic">„{req.message}"</p>
                )}
                <p className="text-xs text-gray-600 mt-1">{timeAgo(req.timestamp)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handle(approveJoinRequest, req.userId)}
                  className="bg-brand-accent hover:bg-emerald-400 text-brand-dark text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Annehmen
                </button>
                <button
                  onClick={() => handle(rejectJoinRequest, req.userId)}
                  className="border border-red-800/50 hover:border-red-500 text-red-500 hover:text-red-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Ablehnen
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {actionError && <p className="text-xs text-red-400 mt-2">{actionError}</p>}
    </section>
  )
}

// ---- Beitritt anfragen (für Nicht-Mitglieder) ----
function JoinRequestForm({ group, onUpdate, currentUser, isVerified }) {
  const [message, setMessage] = useState('')
  const [status, setStatus]   = useState(null)
  const [errMsg, setErrMsg]   = useState('')

  const needsRequest = group.isPrivate || group.type === 'clan'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!currentUser) { setErrMsg('Bitte zuerst einloggen.'); return }
    setErrMsg('')
    try {
      const result = requestToJoin(group.groupId, { ...currentUser, isVerified }, message)
      setStatus(result?.requested ? 'sent' : 'joined')
      onUpdate?.()
    } catch (e) { setErrMsg(e.message); setStatus('error') }
  }

  if (status === 'sent') return (
    <div className="bg-brand-accent/10 border border-brand-accent/30 rounded-xl px-4 py-3 text-sm text-brand-accent">
      ✓ Anfrage gesendet – der Owner wird benachrichtigt.
    </div>
  )
  if (status === 'joined') return (
    <div className="bg-brand-accent/10 border border-brand-accent/30 rounded-xl px-4 py-3 text-sm text-brand-accent">
      ✓ Erfolgreich beigetreten!
    </div>
  )

  return (
    <section>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
        {needsRequest ? '✉ Beitritt anfragen' : '+ Beitreten'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-2">
        {needsRequest && (
          <textarea
            rows={2}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Kurze Vorstellung (optional) – warum möchtest du mitmachen?"
            className="w-full bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-brand-primary"
          />
        )}
        {errMsg && <p className="text-xs text-red-400">{errMsg}</p>}
        <button
          type="submit"
          className={`w-full font-bold py-2 rounded-lg text-sm transition-colors ${
            group.type === 'clan'
              ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
              : 'bg-brand-primary hover:bg-purple-500 text-white'
          }`}
        >
          {needsRequest ? 'Anfrage senden' : 'Direkt beitreten'}
        </button>
      </form>
    </section>
  )
}

// ---- Mitglied einladen (Admins) ----
function InvitePanel({ group, currentUserId, onUpdate }) {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState(null)  // gefundener Spieler
  const [error, setError]     = useState(null)
  const [sent, setSent]       = useState([])    // userId[] dieser Session

  const memberIds  = new Set(group.members.map(m => m.userId))
  const pendingIds = new Set(getPendingInvitesForGroup(group.groupId).map(i => i.toUserId))

  const handleSearch = () => {
    setError(null)
    const q = query.trim().toLowerCase()
    if (!q) return
    const found = MOCK_PLAYERS.find(p => p.username.toLowerCase().includes(q) && p.userId !== currentUserId)
    if (!found)           { setResult(null); setError('Kein Spieler gefunden.'); return }
    if (memberIds.has(found.userId))  { setResult(null); setError('Bereits Mitglied.'); return }
    setResult(found)
  }

  const handleInvite = () => {
    if (!result) return
    setError(null)
    try {
      sendInvite(group.groupId, currentUserId, result.userId, result.username)
      setSent(prev => [...prev, result.userId])
      setResult(null)
      setQuery('')
      onUpdate?.()
    } catch (e) { setError(e.message) }
  }

  return (
    <section>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Mitglied einladen</p>
      <div className="flex gap-2 mb-2">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setResult(null); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Username suchen…"
          className="flex-1 bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
        />
        <button
          onClick={handleSearch}
          className="bg-brand-primary hover:bg-purple-500 text-white text-xs font-bold px-4 rounded-lg transition-colors whitespace-nowrap"
        >
          Suchen
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {result && (
        <div className="flex items-center justify-between bg-brand-dark/60 border border-purple-900/30 rounded-lg px-3 py-2.5 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-xs font-bold text-white">
              {result.username[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{result.username}</p>
              <p className="text-xs text-gray-600">{result.tier}</p>
            </div>
          </div>
          {sent.includes(result.userId) || pendingIds.has(result.userId) ? (
            <span className="text-xs text-brand-accent font-semibold">✓ Eingeladen</span>
          ) : (
            <button
              onClick={handleInvite}
              className="bg-brand-accent hover:bg-emerald-400 text-brand-dark text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              Einladen
            </button>
          )}
        </div>
      )}

      {/* Offene Einladungen */}
      {getPendingInvitesForGroup(group.groupId).length > 0 && (
        <div className="mt-1 space-y-1">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">Ausstehend</p>
          {getPendingInvitesForGroup(group.groupId).map(inv => (
            <div key={inv.inviteId} className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block shrink-0" />
              {inv.toUsername} – eingeladen von {inv.fromUsername}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ---- Haupt-Komponente ----
export default function GroupDetail({ group, onClose, onUpdate }) {
  const { currentUser }  = useAuth()
  const { unlocked }     = useVerification()
  const [annText, setAnnText]   = useState('')
  const [annError, setAnnError] = useState(null)
  const [inviteLink, setInviteLink] = useState(null)
  const [copied, copy]          = useCopyToClipboard()
  const [viewUserId, setViewUserId] = useState(null)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [leaveError,   setLeaveError]   = useState(null)
  const [showReport,   setShowReport]   = useState(false)

  if (!group) return null

  const isClan       = group.type === 'clan'
  const category     = GAME_CATEGORIES[group.category] ?? GAME_CATEGORIES.other
  const currentRole  = group.members.find(m => m.userId === currentUser?.userId)?.role ?? null
  const isAdmin      = canManageMembers(group, currentUser?.userId)
  const canAnnounce  = currentRole && CLAN_ADMIN_ROLES.includes(currentRole)
  const isMember     = currentRole !== null
  const publicAnnouncements = (group.announcements ?? []).filter(a => !a.isSystem)

  const handleAnnouncement = (e) => {
    e.preventDefault()
    setAnnError(null)
    try { addAnnouncement(group.groupId, currentUser?.userId, annText); setAnnText(''); onUpdate?.() }
    catch (err) { setAnnError(err.message) }
  }

  const handleInviteLink = () => {
    const link = generateInviteLink(group.groupId)
    setInviteLink(link)
    copy(link)
  }

  const isOwner = currentRole === GROUP_ROLES.OWNER

  const handleLeaveGroup = () => {
    setLeaveError(null)
    try {
      leaveGroup(group.groupId, currentUser.userId)
      onUpdate?.()
      onClose()
    } catch (e) {
      setLeaveError(e.message)
      setLeaveConfirm(false)
    }
  }

  return (
    <div className="w-full">

      {/* Header */}
      <div className={`sticky top-14 z-10 px-6 py-4 border-b flex items-start justify-between gap-4 ${
        isClan ? 'bg-[#1A1A2E] border-yellow-700/40' : 'bg-[#1A1A2E] border-purple-900/40'
      }`}>
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isClan && (
              <span className="text-sm font-bold font-mono border border-yellow-500/60 text-yellow-400 bg-yellow-900/30 rounded px-2 py-0.5">
                [{group.clanTag}]
              </span>
            )}
            <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${category.color}`}>
              {category.label} · {group.gameType}
            </span>
            {group.requires16 && <span className="text-xs border border-yellow-700/50 text-yellow-500 rounded-full px-2 py-0.5">16+</span>}
            {group.isPrivate && <span className="text-xs border border-gray-600/50 text-gray-400 rounded-full px-2 py-0.5">🔒 Privat</span>}
          </div>
          <h2 className="text-xl font-bold text-white">{group.name}</h2>
          {isClan && group.motto && <p className="text-sm text-yellow-600 italic mt-0.5">„{group.motto}"</p>}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm font-semibold transition-colors"
          >
            ← Zurück
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors"
          >
            ⚑ Melden
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl">

        {/* Ankündigungen (Clans, öffentliche) */}
        {isClan && (
          <section>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">📢 Ankündigungen</p>
            {publicAnnouncements.length > 0 ? (
              <div className="space-y-2">
                {publicAnnouncements.map(ann => (
                  <div key={ann.id} className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-4 py-3">
                    <p className="text-sm text-yellow-100">{ann.text}</p>
                    <p className="text-xs text-yellow-700 mt-1">{ann.authorName} · {timeAgo(ann.postedAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 italic">Noch keine Ankündigungen.</p>
            )}
            {canAnnounce && (
              <form onSubmit={handleAnnouncement} className="mt-3 flex gap-2">
                <input
                  value={annText}
                  onChange={e => setAnnText(e.target.value)}
                  placeholder="Neue Ankündigung…"
                  className="flex-1 bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                  required
                />
                <button type="submit" className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold px-4 rounded-lg transition-colors">
                  Posten
                </button>
              </form>
            )}
            {annError && <p className="text-xs text-red-400 mt-1">{annError}</p>}
          </section>
        )}

        {/* Beitrittsanfragen-Panel (Admins) */}
        {isAdmin && <JoinRequestsPanel group={group} onUpdate={onUpdate} currentUserId={currentUser?.userId} />}

        {/* Session */}
        {group.nextSession && (
          <section className="bg-brand-dark/50 border border-purple-900/30 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Nächste Session</p>
            <p className="text-white font-semibold">{formatFull(group.nextSession)}</p>
          </section>
        )}

        {/* Beschreibung */}
        {group.description && (
          <section>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
              Über {isClan ? 'diesen Clan' : 'diese Gruppe'}
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">{group.description}</p>
          </section>
        )}

        {/* Chat-Fenster (Mitglieder) */}
        {isMember && <ChatWindow group={group} />}

        {/* Mitglieder-Liste */}
        <section>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
            Mitglieder ({group.members.length}/{group.maxMembers})
          </p>
          <div className="space-y-2">
            {group.members.map(m => (
              <div key={m.userId} className="flex items-center justify-between bg-brand-dark/40 rounded-lg px-3 py-2">
                <button
                  onClick={() => setViewUserId(m.userId)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-75 transition-opacity"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${AVATAR_COLOR[m.role] ?? AVATAR_COLOR[GROUP_ROLES.MEMBER]}`}>
                    {m.username[0]}
                  </div>
                  <span className="text-sm text-white font-medium">{m.username}</span>
                  {m.userId === currentUser?.userId && (
                    <span className="text-xs text-gray-600">(Du)</span>
                  )}
                </button>
                <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${ROLE_BADGE_COLOR[m.role] ?? ROLE_BADGE_COLOR[GROUP_ROLES.MEMBER]}`}>
                  {ROLE_LABELS[m.role]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Beitritt anfragen (Nicht-Mitglieder) */}
        {!isMember && <JoinRequestForm group={group} onUpdate={onUpdate} currentUser={currentUser} isVerified={unlocked} />}

        {/* Mitglied einladen (Admins) */}
        {isAdmin && <InvitePanel group={group} currentUserId={currentUser?.userId} onUpdate={onUpdate} />}

        {/* Gruppe/Clan verlassen (Nicht-Owner-Mitglieder) */}
        {isMember && !isOwner && (
          <section>
            {leaveError && <p className="text-xs text-red-400 mb-2">{leaveError}</p>}
            {leaveConfirm ? (
              <DoubleConfirm
                text={isClan ? 'Clan wirklich verlassen?' : 'Gruppe wirklich verlassen?'}
                text2={isClan
                  ? 'Du verlierst deinen Clan-Status und musst erneut beitreten.'
                  : 'Du wirst aus der Gruppe entfernt und musst erneut beitreten.'}
                confirmLabel={isClan ? 'Ja, Clan verlassen' : 'Ja, Gruppe verlassen'}
                onConfirm={handleLeaveGroup}
                onCancel={() => setLeaveConfirm(false)}
              />
            ) : (
              <button
                onClick={() => setLeaveConfirm(true)}
                className="w-full border border-red-900/50 hover:border-red-700/70 text-red-500 hover:text-red-400 text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                {isClan ? 'Clan verlassen' : 'Gruppe verlassen'}
              </button>
            )}
          </section>
        )}

        {/* Invite-Link (Admins) */}
        {isAdmin && (
          <section>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Einladungslink</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-400 truncate">
                {inviteLink ?? '—'}
              </div>
              <button
                onClick={handleInviteLink}
                className="bg-brand-primary hover:bg-purple-500 text-white text-xs font-bold px-4 rounded-lg transition-colors whitespace-nowrap"
              >
                {copied ? '✓ Kopiert!' : 'Link generieren'}
              </button>
            </div>
          </section>
        )}

      </div>

      {/* Spieler-Profil Modal */}
      {viewUserId && (
        <PlayerProfileCard
          userId={viewUserId}
          onClose={() => setViewUserId(null)}
        />
      )}

      {showReport && (
        <ReportModal
          target={{ type: isClan ? 'clan' : 'group', id: group.groupId, name: group.name }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
