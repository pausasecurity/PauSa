import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { timeAgo } from '../utils/timeAgo'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import { joinLobby, leaveLobby, dissolveLobby, kickMember, subscribeLobby, leaveBlockMs, joinBlockMs } from '../services/lobbyService'
import ReadySystem from './ReadySystem'
import PlayerProfileCard from './PlayerProfileCard'
import DoubleConfirm from './shared/DoubleConfirm'
import ReportModal from './ReportModal'

export default function LobbyDetail({ lobby: initialLobby, onClose }) {
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const [lobby, setLobby]               = useState(initialLobby)
  const [error, setError]               = useState(null)
  const [profileMember, setProfileMember] = useState(null)
  const [loading, setLoading]           = useState(false)

  // Echtzeit-Abo: Lobby automatisch aktualisieren (oder schließen wenn gelöscht)
  useEffect(() => {
    return subscribeLobby(initialLobby.lobbyId, updated => {
      if (!updated) { onClose(); return }
      setLobby(updated)
    })
  }, [initialLobby.lobbyId])

  const isMember = currentUser && lobby.members.some(m => m.userId === currentUser.userId)
  const isHost   = currentUser && lobby.createdBy?.userId === currentUser.userId
  const full     = lobby.members.length >= lobby.maxSlots

  const [copied, copy]                = useCopyToClipboard()
  const [confirmAction, setConfirmAction] = useState(null) // 'leave' | 'dissolve' | null
  const [kickTarget, setKickTarget]       = useState(null) // userId pending kick confirm
  const [showReport, setShowReport]   = useState(false)

  const [leaveSecsLeft, setLeaveSecsLeft] = useState(0)
  const [joinSecsLeft,  setJoinSecsLeft]  = useState(0)

  // lobbyRef lets the timer tick always read the latest lobby without restarting the interval on every snapshot
  const lobbyRef = useRef(lobby)
  useEffect(() => { lobbyRef.current = lobby }, [lobby])

  useEffect(() => {
    const tick = () => {
      if (!currentUser) return
      setLeaveSecsLeft(isMember ? Math.ceil(leaveBlockMs(lobbyRef.current, currentUser.userId) / 1000) : 0)
      setJoinSecsLeft(!isMember  ? Math.ceil(joinBlockMs(currentUser.userId) / 1000)                   : 0)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [isMember, currentUser?.userId])

  const handleJoin = useCallback(async () => {
    if (!currentUser) { setError('Bitte zuerst einloggen.'); return }
    setError(null)
    setLoading(true)
    try {
      await joinLobby(lobby.lobbyId, currentUser)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser, lobby.lobbyId])

  const handleLeave = useCallback(async () => {
    if (!currentUser) return
    setError(null)
    setLoading(true)
    try {
      await leaveLobby(lobby.lobbyId, currentUser.userId)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser, lobby.lobbyId, onClose])

  const handleKick = useCallback(async (targetUserId) => {
    if (!currentUser) return
    setError(null)
    setLoading(true)
    try {
      await kickMember(lobby.lobbyId, currentUser.userId, targetUserId)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setKickTarget(null)
    }
  }, [currentUser, lobby.lobbyId])

  const handleDissolve = useCallback(async () => {
    if (!currentUser) return
    setError(null)
    setLoading(true)
    try {
      await dissolveLobby(lobby.lobbyId, currentUser.userId)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser, lobby.lobbyId, onClose])

  return (
    <div className="flex-1 min-w-0 px-6 py-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors"
        >
          {t('lobby.backToLobbies')}
        </button>
        <button
          onClick={() => setShowReport(true)}
          className="text-xs text-gray-600 hover:text-red-400 transition-colors"
        >
          ⚑ {t('lobby.reportLobby')}
        </button>
      </div>

      {/* Header */}
      <div className="bg-brand-card border border-purple-900/40 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-brand-accent text-xs font-semibold uppercase tracking-wider">{lobby.game}</span>
            <h2 className="text-2xl font-bold text-white mt-1 leading-snug">{lobby.title}</h2>
            {lobby.description && (
              <p className="text-gray-400 text-sm mt-2 leading-relaxed">{lobby.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-white">{lobby.members.length}/{lobby.maxSlots}</p>
            <p className="text-xs text-gray-500">{full ? t('lobby.full') : `${lobby.maxSlots - lobby.members.length} ${t('lobby.freeSlot')}`}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mt-4">
          {lobby.requiresMic && (
            <span className="text-xs bg-purple-900/30 border border-purple-700/40 text-purple-300 px-2 py-1 rounded-full">🎤 Mic Pflicht</span>
          )}
          {lobby.minRank && (
            <span className="text-xs bg-purple-900/30 border border-purple-700/40 text-gray-300 px-2 py-1 rounded-full">🏆 Min. {lobby.minRank}</span>
          )}
          <span className="text-xs bg-purple-900/30 border border-purple-700/40 text-gray-400 px-2 py-1 rounded-full">
            {lobby.language === 'de' ? '🇩🇪 Deutsch' : lobby.language === 'en' ? '🇬🇧 English' : '🌐 Egal'}
          </span>
          {lobby.platform && lobby.platform !== 'crossplay' && (
            <span className="text-xs bg-purple-900/30 border border-purple-700/40 text-gray-300 px-2 py-1 rounded-full">
              {{pc:'PC',psn:'PlayStation',xbox:'Xbox',nintendo:'Nintendo Switch'}[lobby.platform] ?? lobby.platform}
            </span>
          )}
          <span className="text-xs text-gray-600 ml-auto self-center">Erstellt {timeAgo(lobby.createdAt)}</span>
        </div>

        {/* Join Code */}
        {lobby.joinCode && (
          <div className="mt-4 flex items-center gap-3 bg-brand-dark border border-gray-800 rounded-lg px-4 py-2.5">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest leading-none mb-1">Lobby-Code</p>
              <p className="text-lg font-mono font-bold text-white tracking-widest">{lobby.joinCode}</p>
            </div>
            <button
              onClick={() => copy(lobby.joinCode)}
              className="ml-auto text-xs border border-gray-700 hover:border-brand-primary text-gray-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? t('common.copied') : t('common.copy')}
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2 mt-4">{error}</p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {isMember ? (
            <>
              {confirmAction ? (
                <DoubleConfirm
                  text={confirmAction === 'dissolve'
                    ? t('lobby.dissolveConfirm1')
                    : t('lobby.leaveConfirm1')}
                  text2={confirmAction === 'dissolve'
                    ? t('lobby.dissolveConfirm2')
                    : t('lobby.leaveConfirm2')}
                  confirmLabel={confirmAction === 'dissolve' ? t('lobby.dissolveLabel') : t('lobby.leaveLabel')}
                  onConfirm={confirmAction === 'dissolve' ? handleDissolve : handleLeave}
                  onCancel={() => setConfirmAction(null)}
                  loading={loading}
                />
              ) : isHost ? (
                <button
                  onClick={() => setConfirmAction('dissolve')}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:border-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed border-red-700/60 text-red-400 hover:border-red-500 hover:text-red-300 hover:bg-red-900/10"
                >
                  {t('lobby.dissolveBtn')}
                </button>
              ) : (
                <button
                  onClick={() => !leaveSecsLeft && setConfirmAction('leave')}
                  disabled={leaveSecsLeft > 0 || loading}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:border-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed border-red-800/40 text-red-400 hover:border-red-600/60 hover:text-red-300"
                >
                  {leaveSecsLeft > 0 ? t('lobby.leaveBlocked', { secs: leaveSecsLeft }) : t('lobby.leaveBtn')}
                </button>
              )}
              {!isHost && !confirmAction && leaveSecsLeft > 0 && (
                <p className="text-xs text-gray-600">{t('lobby.leaveMinWait')}</p>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleJoin}
                disabled={full || joinSecsLeft > 0 || loading}
                className="px-6 py-2 rounded-lg text-sm font-semibold transition-colors disabled:bg-gray-800 disabled:text-gray-600 bg-brand-primary hover:bg-purple-500 text-white"
              >
                {full ? t('lobby.full') : joinSecsLeft > 0 ? t('lobby.joinBlocked', { secs: joinSecsLeft }) : loading ? t('lobby.joining') : t('lobby.join')}
              </button>
              {joinSecsLeft > 0 && (
                <p className="text-xs text-gray-600">{t('lobby.leaveCooldown')}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Ready-System – nur für Mitglieder */}
      {isMember && <ReadySystem lobby={lobby} />}

      {/* Members */}
      <div className="bg-brand-card border border-purple-900/40 rounded-xl p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">
          {t('lobby.members')} ({lobby.members.length}/{lobby.maxSlots})
        </p>
        <div className="space-y-3">
          {lobby.members.map(m => {
            const isMe      = currentUser && m.userId === currentUser.userId
            const isMemberHost = m.userId === lobby.createdBy.userId
            const canKick   = isHost && !isMe && !isMemberHost
            const pendingKick = kickTarget === m.userId
            return (
              <div
                key={m.userId}
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 transition-colors"
              >
                <div
                  onClick={() => !isMe && !pendingKick && setProfileMember(m)}
                  className={`flex items-center gap-3 flex-1 min-w-0 ${!isMe ? 'cursor-pointer' : ''}`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {m.username[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {m.username}
                      {isMemberHost && (
                        <span className="ml-2 text-xs text-yellow-500 font-normal">{t('lobby.host')}</span>
                      )}
                      {isMe && (
                        <span className="ml-2 text-xs text-brand-accent font-normal">({t('lobby.you')})</span>
                      )}
                    </p>
                    {!isMe && (
                      <p className="text-xs text-gray-600">{t('lobby.viewProfile')}</p>
                    )}
                  </div>
                </div>

                <span className={`text-xs font-semibold shrink-0 ${m.isReady ? 'text-brand-accent' : 'text-gray-600'}`}>
                  {m.isReady ? t('lobby.ready') : t('lobby.notReady')}
                </span>

                {canKick && (
                  pendingKick ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleKick(m.userId)}
                        disabled={loading}
                        className="text-xs px-2 py-1 rounded bg-red-900/60 border border-red-700/60 text-red-300 hover:bg-red-800/70 transition-colors disabled:opacity-50"
                      >
                        {t('lobby.kickConfirm')}
                      </button>
                      <button
                        onClick={() => setKickTarget(null)}
                        className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setKickTarget(m.userId)}
                      className="text-xs px-2 py-1 rounded border border-red-900/50 text-red-500 hover:border-red-700/70 hover:text-red-300 hover:bg-red-900/10 transition-colors shrink-0"
                    >
                      {t('lobby.kick')}
                    </button>
                  )
                )}
              </div>
            )
          })}
          {Array.from({ length: lobby.maxSlots - lobby.members.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-3 opacity-30">
              <div className="w-9 h-9 rounded-full border border-dashed border-gray-700" />
              <p className="text-sm text-gray-600">{t('lobby.freeSlot')}</p>
            </div>
          ))}
        </div>
      </div>

      {profileMember && (
        <PlayerProfileCard
          userId={profileMember.userId}
          fallbackUsername={profileMember.username}
          inSameLobby={!!lobby?.allReadyAt}
          onClose={() => setProfileMember(null)}
        />
      )}

      {showReport && (
        <ReportModal
          target={{ type: 'lobby', id: lobby.lobbyId, name: `${lobby.game} – ${lobby.title}` }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
