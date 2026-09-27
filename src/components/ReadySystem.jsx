import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { setReady } from '../services/lobbyService'
import { getMockPlayer } from '../data/mockPlayers'
import { PLATFORM_META } from '../data/constants'
import { hasRatedSession } from '../services/ratingService'
import RatingModal from './RatingModal'
import { generateSocialAction } from '../utils/socialLinks'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'

const READY_DELAY_MS = 90 * 1000
const GAME_TIMER_MS  = 5 * 60 * 1000

function SocialActionButton({ platform, id }) {
  const { t } = useTranslation()
  const [copied, copy] = useCopyToClipboard()
  const meta   = PLATFORM_META[platform]
  const action = generateSocialAction(platform, id)

  const handleClick = () => {
    if (action.type === 'deep-link') {
      window.open(action.value, '_blank', 'noopener,noreferrer')
    } else {
      copy(action.value)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-between w-full rounded-lg border px-3 py-2 hover:brightness-125 transition-all ${meta.color}`}
    >
      <span className="text-xs font-semibold">{meta.label}</span>
      <span className="text-xs font-mono text-white/70">
        {copied ? t('common.copied') : action.label}
      </span>
    </button>
  )
}

function MemberAddPanel({ member }) {
  const { t } = useTranslation()
  const mockData = getMockPlayer(member.userId)
  const links = mockData
    ? Object.entries(mockData.socialLinks).filter(([, id]) => id)
    : []

  return (
    <div className="bg-brand-dark/40 border border-purple-900/30 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-brand-accent" />
        <span className="text-sm font-semibold text-white">{member.username}</span>
        {member.isReady && (
          <span className="text-xs bg-brand-accent/20 text-brand-accent border border-brand-accent/40 px-1.5 py-0.5 rounded-full">Ready</span>
        )}
      </div>
      {links.length > 0 ? (
        <div className="space-y-1.5">
          {links.map(([platform, id]) => (
            <SocialActionButton key={platform} platform={platform} id={id} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-600 italic">{t('ready.noSocialIds')}</p>
      )}
    </div>
  )
}

// lobby wird von LobbyDetail per Echtzeit-Subscription übergeben
export default function ReadySystem({ lobby }) {
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const me = lobby?.members.find(m => m.userId === currentUser?.userId)
  const [isReady, setIsReady] = useState(me?.isReady ?? false)

  // Sync wenn external update das isReady-Flag ändert
  React.useEffect(() => {
    const updated = lobby?.members.find(m => m.userId === currentUser?.userId)
    if (updated) setIsReady(updated.isReady)
  }, [lobby, currentUser])

  const [showRating, setShowRating] = useState(false)
  const [timerPhase, setTimerPhase] = useState(null)  // null | 'delay' | 'game' | 'done'
  const [timerLeft,  setTimerLeft]  = useState(0)     // ms remaining in current phase

  // Countdown basierend auf allReadyAt aus Firestore
  useEffect(() => {
    if (!lobby?.allReadyAt) { setTimerPhase(null); setTimerLeft(0); return }
    const allReadyTime = new Date(lobby.allReadyAt).getTime()
    const gameStart    = allReadyTime + READY_DELAY_MS
    const gameEnd      = gameStart + GAME_TIMER_MS

    const tick = () => {
      const now = Date.now()
      if (now < gameStart) {
        setTimerPhase('delay')
        setTimerLeft(gameStart - now)
      } else if (now < gameEnd) {
        setTimerPhase('game')
        setTimerLeft(gameEnd - now)
      } else {
        setTimerPhase('done')
        setTimerLeft(0)
      }
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [lobby?.allReadyAt])

  // Rating öffnen wenn Game-Timer abgelaufen
  useEffect(() => {
    if (timerPhase !== 'done') return
    if (!currentUser || !lobby) return
    if (hasRatedSession(lobby.lobbyId, currentUser.userId)) return
    setShowRating(true)
  }, [timerPhase, currentUser, lobby])

  if (!currentUser || !lobby) return null

  const allReady = lobby.members.length >= 2 && lobby.members.every(m => m.isReady)
  // Sperrt Button sofort wenn User ready ist und alle anderen auch — bevor allReadyAt-Snapshot eintrifft
  const otherMembers = lobby.members.filter(m => m.userId !== currentUser.userId)
  const localAllReady = isReady && otherMembers.length >= 1 && otherMembers.every(m => m.isReady)
  const isLocked = timerPhase !== null || localAllReady

  const fmtMs = ms => {
    const s = Math.ceil(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }
  const progress = timerPhase === 'game' ? Math.max(0, timerLeft / GAME_TIMER_MS) : 0

  const handleToggle = async () => {
    const next = !isReady
    setIsReady(next)
    try {
      await setReady(lobby.lobbyId, currentUser.userId, next)
    } catch {
      setIsReady(!next)
    }
  }

  return (
    <>
    {showRating && (
      <RatingModal
        lobby={lobby}
        currentUser={currentUser}
        onClose={() => setShowRating(false)}
      />
    )}
    <section className="bg-gradient-to-r from-brand-surface to-brand-card border border-purple-900/30 rounded-xl p-5 mb-6">

      {/* Delay-Phase: 90s Countdown bevor Game-Timer startet */}
      {timerPhase === 'delay' && (
        <div className="mb-5 flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
          <span className="text-xs text-yellow-400 uppercase tracking-widest">{t('ready.gameStartsIn')}</span>
          <span className="text-2xl font-mono font-bold text-yellow-300 tabular-nums">{fmtMs(timerLeft)}</span>
        </div>
      )}

      {/* Game-Phase: 5-Minuten-Timer */}
      {(timerPhase === 'game' || timerPhase === 'done') && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-widest">
              {timerPhase === 'done' ? t('ready.sessionEnded') : t('ready.gameRunning')}
            </span>
            <span className={`text-2xl font-mono font-bold tabular-nums ${timerPhase === 'done' ? 'text-brand-accent' : 'text-white'}`}>
              {timerPhase === 'done' ? '0:00' : fmtMs(timerLeft)}
            </span>
          </div>
          <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress * 100}%`,
                background: progress > 0.4 ? '#10b981' : progress > 0.15 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          {timerPhase === 'done' && (
            <p className="text-xs text-brand-accent mt-2">{t('ready.ratingOpening')}</p>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold truncate">{lobby.title}</h3>
            <span className="shrink-0 text-xs text-brand-accent border border-brand-accent/40 bg-brand-accent/10 px-1.5 py-0.5 rounded-full">
              {lobby.members.length}/{lobby.maxSlots}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{lobby.game}</p>

          {/* Social-Add-Panel: erst wenn alle Mitglieder ready sind */}
          {timerPhase !== null && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{t('ready.addPlayers')}</p>
              {lobby.members
                .filter(m => m.userId !== currentUser.userId)
                .map(m => <MemberAddPanel key={m.userId} member={m} />)
              }
            </div>
          )}
        </div>

        {/* Ready-Toggle — gesperrt sobald Timer läuft oder alle ready sind */}
        <button
          onClick={handleToggle}
          disabled={isLocked}
          aria-pressed={isReady}
          className={`shrink-0 font-bold px-6 py-3 rounded-xl transition-colors ${
            isLocked
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : isReady
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-brand-accent hover:bg-emerald-400 text-brand-dark'
          }`}
        >
          {isReady ? t('ready.readyBtn') : t('ready.readyExclaim')}
        </button>
      </div>
    </section>
    </>
  )
}
