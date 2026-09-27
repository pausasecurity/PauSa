import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  subscribeFriendDoc,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  statusOf,
  getFriendCount,
} from '../services/friendService'
import { getRatingsFor } from '../services/ratingService'
import { getMockPlayer } from '../data/mockPlayers'
import { useAuth } from '../context/AuthContext'
import { TIER_COLORS, PLATFORM_ICONS } from '../data/constants'
import { GAMES } from '../data/games'
import Avatar from './shared/Avatar'
import { socialVisible } from '../utils/socialPrivacy'
import { getUserDoc } from '../services/userService'
import ReportModal from './ReportModal'

function StatusButton({ status, onSend, onCancel, onAccept, onReject, onRemove }) {
  const { t } = useTranslation()
  if (status === null) return (
    <button
      onClick={onSend}
      className="w-full bg-brand-primary hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
    >
      {t('profile.addFriend')}
    </button>
  )
  if (status === 'pending_sent') return (
    <div className="flex items-center gap-2">
      <div className="flex-1 text-center bg-brand-dark/60 border border-purple-800/40 text-gray-400 font-semibold py-2.5 rounded-xl text-sm">
        {t('profile.requestPending')}
      </div>
      <button
        onClick={onCancel}
        className="border border-red-800/50 hover:border-red-500 text-red-400 font-bold py-2.5 px-4 rounded-xl text-sm transition-colors"
      >
        ✕
      </button>
    </div>
  )
  if (status === 'pending_received') return (
    <div className="flex gap-2">
      <button onClick={onAccept} className="flex-1 bg-brand-accent hover:bg-emerald-400 text-brand-dark font-bold py-2.5 rounded-xl text-sm transition-colors">
        ✓ {t('common.accept')}
      </button>
      <button onClick={onReject} className="flex-1 border border-red-800/50 hover:border-red-500 text-red-400 font-bold py-2.5 rounded-xl text-sm transition-colors">
        {t('common.decline')}
      </button>
    </div>
  )
  if (status === 'accepted') return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-semibold text-brand-accent flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-brand-accent" /> {t('profile.friends')}
      </span>
      <button onClick={onRemove} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
        {t('profile.removeFriend')}
      </button>
    </div>
  )
  return null
}

function StarRow({ avg, size = 'text-lg' }) {
  const filled = Math.round(avg)
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`${size} ${n <= filled ? 'text-yellow-400' : 'text-gray-700'}`}>★</span>
      ))}
    </div>
  )
}

export default function PlayerProfileCard({ userId, fallbackUsername, inSameLobby = false, isFriend: isFriendProp = false, onClose }) {
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const [friendDoc, setFriendDoc]         = useState(null)
  const [firestoreLinks, setFirestoreLinks] = useState(null)
  const [firestoreUsername, setFirestoreUsername] = useState(null)
  const [firestoreGames, setFirestoreGames] = useState(null)
  const [friendCount, setFriendCount]     = useState(null)
  const [ratings, setRatings]             = useState([])
  const [showComments, setShowComments]   = useState(false)
  const [error, setError]                 = useState(null)
  const [showReport, setShowReport]       = useState(false)

  const isOwnProfile = currentUser?.userId === userId

  useEffect(() => {
    if (!currentUser?.userId || isOwnProfile) { setFriendDoc(null); return }
    return subscribeFriendDoc(currentUser.userId, userId, setFriendDoc)
  }, [currentUser?.userId, userId, isOwnProfile])

  useEffect(() => {
    getUserDoc(userId).then(doc => {
      setFirestoreLinks(doc?.socialLinks ?? null)
      if (doc?.username) setFirestoreUsername(doc.username)
      if (Array.isArray(doc?.favoriteGames)) setFirestoreGames(doc.favoriteGames)
    }).catch(() => {})

    getFriendCount(userId).then(setFriendCount).catch(() => {})
    getRatingsFor(userId).then(setRatings).catch(() => {})
  }, [userId])

  const mockPlayer = getMockPlayer(userId)
  const player = mockPlayer ?? {
    userId,
    username:    firestoreUsername ?? fallbackUsername ?? userId,
    tier:        'Unranked',
    bio:         null,
    games:       [],
    socialLinks: {},
    isVerified:  false,
    clanTag:     null,
  }

  const status       = statusOf(friendDoc, currentUser?.userId)
  const isFriendNow  = isFriendProp || status === 'accepted'
  const canViewSocial = socialVisible(isOwnProfile, isFriendNow, inSameLobby)

  const handleSend   = useCallback(async () => {
    try { await sendFriendRequest(currentUser, userId, player.username); setError(null) }
    catch (e) { setError(e.message) }
  }, [currentUser, userId, player.username])
  const handleCancel  = useCallback(() => cancelFriendRequest(friendDoc?.docId).catch(e => setError(e.message)), [friendDoc])
  const handleAccept  = useCallback(() => acceptFriendRequest(friendDoc?.docId).catch(e => setError(e.message)), [friendDoc])
  const handleReject  = useCallback(() => rejectFriendRequest(friendDoc?.docId).catch(e => setError(e.message)), [friendDoc])
  const handleRemove  = useCallback(() => removeFriend(friendDoc?.docId).catch(e => setError(e.message)), [friendDoc])

  const tierColor     = TIER_COLORS[player.tier] ?? 'text-gray-400'
  const resolvedLinks = firestoreLinks ?? player.socialLinks ?? {}
  const socialEntries = Object.entries(resolvedLinks).filter(([, v]) => v)

  // Spiele: mock-Array hat Strings, Firestore-Array hat IDs → zu Labels auflösen
  const displayGames = player.games.length > 0
    ? player.games
    : (firestoreGames ?? []).map(id => GAMES.find(g => g.id === id)?.label ?? id)

  // Bewertungs-Statistik
  const ratingCount = ratings.length
  const ratingAvg   = ratingCount > 0
    ? Math.round(ratings.reduce((s, r) => s + r.stars, 0) / ratingCount * 10) / 10
    : null
  const commentsWithText = ratings.filter(r => r.comment?.trim())

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#1A1A2E] border border-purple-800/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-brand-surface px-6 py-5 border-b border-purple-900/40 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar username={player.username} size="lg" className="rounded-2xl" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">{player.username}</h2>
                {player.isVerified && (
                  <span className="text-xs font-semibold text-brand-accent border border-brand-accent/40 rounded-full px-1.5 py-0.5">✓ Verifiziert</span>
                )}
              </div>
              <p className={`text-sm font-semibold mt-0.5 ${tierColor}`}>{player.tier}</p>
              {player.clanTag && (
                <p className="text-xs text-yellow-500 font-mono">{player.clanTag}</p>
              )}
              {friendCount !== null && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {friendCount} {friendCount === 1 ? t('profile.friendLabel') : t('profile.friendsLabel')}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl shrink-0 transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-5">

          {player.bio && (
            <p className="text-sm text-gray-300 leading-relaxed italic">{player.bio}</p>
          )}

          {/* Lieblingsspiele */}
          {displayGames.length > 0 && (
            <section>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{t('profile.favGames')}</p>
              <div className="flex flex-wrap gap-1.5">
                {displayGames.map(g => (
                  <span key={g} className="bg-brand-dark/80 border border-purple-900/40 text-gray-300 text-xs px-2 py-1 rounded-lg">
                    {g}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Bewertungen */}
          <section>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{t('profile.ratings')}</p>
            {ratingCount === 0 ? (
              <p className="text-sm text-gray-600 italic">{t('profile.noReviews')}</p>
            ) : (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StarRow avg={ratingAvg} />
                  <span className="text-sm font-semibold text-white">{ratingAvg}</span>
                  <span className="text-xs text-gray-500">({ratingCount} {ratingCount === 1 ? t('profile.review') : t('profile.reviewsPlural')})</span>
                  {commentsWithText.length > 0 && (
                    <button
                      onClick={() => setShowComments(v => !v)}
                      className="ml-auto text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      {showComments ? t('profile.hide') : `${t('profile.comments')} (${commentsWithText.length})`}
                    </button>
                  )}
                </div>
                {showComments && (
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
                    {commentsWithText.map((r, i) => (
                      <div key={i} className="bg-brand-dark/60 border border-purple-900/20 rounded-lg px-3 py-2">
                        <StarRow avg={r.stars} size="text-xs" />
                        <p className="text-xs text-gray-400 mt-1">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Social Links — Privacy Shield */}
          <section>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{t('profile.linkedAccounts')}</p>
            {canViewSocial ? (
              socialEntries.length > 0 ? (
                <div className="space-y-2">
                  {socialEntries.map(([platform, id]) => {
                    const cfg = PLATFORM_ICONS[platform]
                    if (!cfg) return null
                    return (
                      <div key={platform} className={`flex items-center gap-3 border rounded-xl px-3 py-2 text-sm font-mono ${cfg.color}`}>
                        <span className="text-xs text-gray-400 w-16 shrink-0">{cfg.label}</span>
                        <span className="truncate">{id}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600 italic">{t('profile.noLinkedAccounts')}</p>
              )
            ) : (
              <div className="bg-brand-dark/60 border border-purple-900/30 rounded-xl px-4 py-4 text-center">
                <p className="text-sm text-gray-500">{t('profile.friendsOnlyIds')}</p>
              </div>
            )}
          </section>

          {/* Friend Action */}
          {!isOwnProfile && (
            <section>
              {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
              <StatusButton
                status={status}
                onSend={handleSend}
                onCancel={handleCancel}
                onAccept={handleAccept}
                onReject={handleReject}
                onRemove={handleRemove}
              />
              <button
                onClick={() => setShowReport(true)}
                className="mt-3 w-full text-xs text-gray-600 hover:text-red-400 transition-colors text-center py-1"
              >
                {t('profile.reportProfile')}
              </button>
            </section>
          )}

        </div>
      </div>

      {showReport && (
        <ReportModal
          target={{ type: 'profile', id: userId, name: player.username }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
