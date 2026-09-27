import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  GAME_CATEGORIES, GROUP_ROLES, CLAN_ADMIN_ROLES, MIN_CLAN_MEMBERS,
  isGroupFull, joinGroup, convertToClan, getPendingInvitesForUser,
} from '../services/groupService'
import { timeAgo } from '../utils/timeAgo'
import { useVerification } from '../context/VerificationContext'
import { useAuth } from '../context/AuthContext'

function formatSession(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Rollenfarben für Member-Liste
const ROLE_BADGE = {
  [GROUP_ROLES.LEADER]:  'bg-yellow-500/20 text-yellow-400 border-yellow-600/40',
  [GROUP_ROLES.OFFICER]: 'bg-blue-500/20 text-blue-300 border-blue-600/40',
  [GROUP_ROLES.GM]:      'bg-amber-500/20 text-amber-400 border-amber-600/40',
  [GROUP_ROLES.OWNER]:   'bg-purple-500/20 text-purple-300 border-purple-600/40',
  [GROUP_ROLES.MEMBER]:  'bg-gray-800/60 text-gray-500 border-gray-700/40',
}
const ROLE_LABEL = {
  [GROUP_ROLES.LEADER]:  'Leader',
  [GROUP_ROLES.OFFICER]: 'Officer',
  [GROUP_ROLES.GM]:      'GM',
  [GROUP_ROLES.OWNER]:   'Owner',
  [GROUP_ROLES.MEMBER]:  'Member',
}

// ---- Upgrade-Formular (inline, nur für Owner einer Gruppe) ----
function UpgradeForm({ group, onUpgraded, currentUserId }) {
  const [tag, setTag]       = useState('')
  const [motto, setMotto]   = useState('')
  const [force, setForce]   = useState(false)
  const [error, setError]   = useState(null)

  const needsForce = group.members.length < MIN_CLAN_MEMBERS

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    try {
      convertToClan(group.groupId, currentUserId, { clanTag: tag, motto }, force)
      onUpgraded()
    } catch (err) {
      if (err.code === 'INSUFFICIENT_MEMBERS') {
        setError(`Empfehlung: mind. ${err.required} Mitglieder (aktuell: ${err.current}). Du kannst trotzdem aufwerten.`)
        setForce(true)
      } else {
        setError(err.message)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-yellow-700/30 pt-3">
      <p className="text-xs text-yellow-400 font-semibold uppercase tracking-widest">Clan-Daten eingeben</p>
      <div className="flex gap-2">
        <input
          value={tag}
          onChange={e => setTag(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="TAG"
          maxLength={4}
          className="w-20 bg-brand-dark border border-gray-700 rounded-lg px-2 py-1.5 text-sm font-mono text-white text-center focus:outline-none focus:border-yellow-500"
          required
        />
        <input
          value={motto}
          onChange={e => setMotto(e.target.value)}
          placeholder="Clan-Motto (optional)"
          className="flex-1 bg-brand-dark border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-500"
        />
      </div>

      {needsForce && (
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)}
            className="accent-yellow-500" />
          Trotzdem aufwerten ({group.members.length}/{MIN_CLAN_MEMBERS} Mitglieder)
        </label>
      )}

      {error && <p className="text-xs text-yellow-500">{error}</p>}

      <button
        type="submit"
        disabled={!tag || (needsForce && !force)}
        className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-2 rounded-lg text-sm transition-colors"
      >
        Jetzt zum Clan aufwerten ✦
      </button>
    </form>
  )
}

// ---- GroupCard ----
const GroupCard = React.memo(function GroupCard({ group, onUpdate, onOpenDetail }) {
  const { t } = useTranslation()
  const { unlocked }              = useVerification()
  const { currentUser }           = useAuth()
  const [joined, setJoined]       = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [expanded, setExpanded]   = useState(false)

  const isClan    = group.type === 'clan'
  const category  = GAME_CATEGORIES[group.category] ?? GAME_CATEGORIES.other
  const full      = isGroupFull(group)
  const slotsLeft = group.maxMembers - group.members.length
  const currentUserRole = group.members.find(m => m.userId === currentUser?.userId)?.role ?? null
  const isOwner   = currentUserRole === GROUP_ROLES.OWNER
  const isMember  = currentUserRole !== null
  const latestAnn = isClan && group.announcements?.[0]

  const hasInvite = currentUser
    ? getPendingInvitesForUser(currentUser.userId).some(i => i.groupId === group.groupId)
    : false

  const handleJoin = () => {
    if (!currentUser) { setJoinError('Bitte zuerst einloggen.'); return }
    setJoinError(null)
    try {
      joinGroup(group.groupId, { ...currentUser, isVerified: unlocked })
      setJoined(true)
      onUpdate?.()
    } catch (e) { setJoinError(e.message) }
  }

  // Clan: goldener Rahmen; Gruppe: Standard-Lila
  const borderClass = isClan
    ? 'border-yellow-500/50 hover:border-yellow-400/70 shadow-yellow-900/20'
    : full
      ? 'border-gray-800/60 opacity-70'
      : 'border-purple-900/40 hover:border-brand-primary/50'

  return (
    <div className={`bg-brand-card border rounded-xl p-5 flex flex-col gap-3 transition-all shadow-lg ${borderClass}`}>

      {/* Clan: gepinnte Ankündigung ganz oben */}
      {latestAnn && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2 text-xs">
          <span className="text-yellow-500 font-semibold mr-1">📢</span>
          <span className="text-yellow-200">{latestAnn.text}</span>
          <span className="text-yellow-700 ml-2">{timeAgo(latestAnn.postedAt)}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {/* Clan-Tag Badge */}
            {isClan && (
              <span className="text-xs font-bold border border-yellow-500/60 text-yellow-400 bg-yellow-900/20 rounded px-1.5 py-0.5 font-mono">
                [{group.clanTag}]
              </span>
            )}
            <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${category.color}`}>
              {category.label}
            </span>
            <span className="text-xs text-gray-500">{group.gameType}</span>
            {group.requires16 && <span className="text-xs border border-yellow-700/50 text-yellow-500 rounded-full px-2 py-0.5">16+</span>}
          </div>

          <button
            onClick={() => onOpenDetail?.(group)}
            className="text-left font-bold text-white leading-tight hover:text-brand-primary transition-colors"
          >
            {group.name}
          </button>

          {/* Motto (nur Clans) */}
          {isClan && group.motto && (
            <p className="text-xs text-yellow-600 italic mt-0.5">„{group.motto}"</p>
          )}
        </div>

        {/* Slot-Anzeige */}
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold ${full ? 'text-gray-600' : 'text-white'}`}>
            {group.members.length}/{group.maxMembers}
          </p>
          <p className="text-xs text-gray-600">{full ? t('groups.full') : `${slotsLeft} ${t('groups.freeSlots')}`}</p>
        </div>
      </div>

      {/* Mitglieder-Avatare mit Rollen-Tooltip */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {group.members.map(m => (
          <div key={m.userId} className="relative group/avatar">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-brand-card ${
              m.role === GROUP_ROLES.LEADER  ? 'bg-gradient-to-br from-yellow-500 to-amber-600' :
              m.role === GROUP_ROLES.OFFICER ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
              m.role === GROUP_ROLES.GM      ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                                               'bg-gradient-to-br from-brand-primary to-brand-secondary'
            }`}>
              {m.username[0]}
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/avatar:flex flex-col items-center z-10 pointer-events-none">
              <span className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {m.username} · {ROLE_LABEL[m.role]}
              </span>
            </div>
          </div>
        ))}
        {Array.from({ length: slotsLeft }).map((_, i) => (
          <div key={`empty-${i}`} className="w-7 h-7 rounded-full border border-dashed border-gray-700" />
        ))}
      </div>

      {/* Nächste Session */}
      {group.nextSession && (
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-brand-dark/40 rounded-lg px-3 py-2">
          <span>📅</span>
          <span>{t('groups.nextSession')}: <span className="text-white font-semibold">{formatSession(group.nextSession)}</span></span>
        </div>
      )}

      {/* Description */}
      {group.description && (
        <div>
          <p className={`text-sm text-gray-400 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {group.description}
          </p>
          {group.description.length > 80 && (
            <button onClick={() => setExpanded(v => !v)} className="text-xs text-brand-primary hover:text-purple-300 mt-1 transition-colors">
              {expanded ? t('groups.less') : t('groups.readMore')}
            </button>
          )}
        </div>
      )}

      {/* Join-Error */}
      {joinError && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{joinError}</p>
      )}

      {/* Actions */}
      {!isMember && (
        joined ? (
          <p className="text-xs text-brand-accent font-semibold text-center py-2">✓ {t('groups.joined')}</p>
        ) : (
          <button
            onClick={handleJoin}
            disabled={full || (group.isPrivate && !hasInvite)}
            className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
              full || (group.isPrivate && !hasInvite) ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
              group.requires16 && !unlocked ? 'border border-yellow-700/50 text-yellow-500 hover:border-yellow-500' :
              isClan ? 'bg-yellow-600 hover:bg-yellow-500 text-white' :
              'bg-brand-primary hover:bg-purple-500 text-white'
            }`}
          >
            {full ? t('groups.full')
           : group.isPrivate && !hasInvite ? t('groups.inviteOnly')
           : group.requires16 && !unlocked ? t('groups.verificationNeeded')
           : isClan ? t('groups.joinClan')
           : t('lobby.join')}
          </button>
        )
      )}

      {/* Owner: Clan-Upgrade-Button (nur für Gruppen) */}
      {isOwner && !isClan && (
        <button
          onClick={() => setShowUpgrade(v => !v)}
          className="w-full border border-yellow-700/50 hover:border-yellow-500 text-yellow-500 hover:text-yellow-400 text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {showUpgrade ? t('groups.cancelUpgrade') : t('groups.upgradeToClan')}
        </button>
      )}
      {isOwner && !isClan && showUpgrade && (
        <UpgradeForm
          group={group}
          currentUserId={currentUser?.userId}
          onUpgraded={() => { setShowUpgrade(false); onUpdate?.() }}
        />
      )}
    </div>
  )
})

export default GroupCard
