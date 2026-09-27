import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  subscribeFriends,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  peerOf,
} from '../services/friendService'
import { searchUsers, subscribeUsernames } from '../services/userService'
import { useAuth } from '../context/AuthContext'
import { getMockPlayer } from '../data/mockPlayers'
import { TIER_COLORS } from '../data/constants'
import { sanitizeText } from '../utils/sanitize'
import PlayerProfileCard from './PlayerProfileCard'
import Avatar from './shared/Avatar'

const FriendRow = React.memo(function FriendRow({ peer, onAction, onViewProfile }) {
  const mock = getMockPlayer(peer.userId)
  const tier = mock?.tier ?? null

  return (
    <div className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-purple-900/20 rounded-xl px-4 py-3">
      <button
        onClick={() => onViewProfile(peer.userId, peer.username)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
      >
        <Avatar username={peer.username} size="sm" className="w-9 h-9" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{peer.username}</p>
          {tier && <p className={`text-xs font-medium ${TIER_COLORS[tier] ?? 'text-gray-400'}`}>{tier}</p>}
        </div>
      </button>
      {onAction}
    </div>
  )
})

function Section({ title, children, count }) {
  if (count === 0) return null
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest">{title}</p>
        <span className="bg-brand-primary/80 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export default function FriendsList() {
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const [friends, setFriends]         = useState({ accepted: [], pendingSent: [], pendingReceived: [] })
  const [viewProfile, setViewProfile] = useState(null) // { userId, username } | null
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchError, setSearchError]     = useState('')
  const [searching, setSearching]         = useState(false)

  useEffect(() => {
    if (!currentUser?.userId) return
    return subscribeFriends(currentUser.userId, setFriends)
  }, [currentUser?.userId])

  const { accepted, pendingSent, pendingReceived } = friends

  // Real-time username subscription: subscribes to users/{uid} for every peer
  const [freshNames, setFreshNames] = useState({})
  const peerUidsKey = useMemo(() => {
    const uids = new Set()
    ;[...accepted, ...pendingSent, ...pendingReceived].forEach(f => {
      const uid = peerOf(f, currentUser?.userId).userId
      if (uid) uids.add(uid)
    })
    return [...uids].sort().join(',')
  }, [accepted, pendingSent, pendingReceived, currentUser?.userId])

  useEffect(() => {
    if (!peerUidsKey) return
    return subscribeUsernames(peerUidsKey.split(','), setFreshNames)
  }, [peerUidsKey])

  const knownIds = useMemo(() => new Set([
    ...accepted.map(f => peerOf(f, currentUser?.userId).userId),
    ...pendingSent.map(f => peerOf(f, currentUser?.userId).userId),
    ...pendingReceived.map(f => peerOf(f, currentUser?.userId).userId),
  ]), [accepted, pendingSent, pendingReceived, currentUser?.userId])

  const handleSearch = async (e) => {
    e.preventDefault()
    setSearchError('')
    const q = sanitizeText(searchQuery, 30)
    if (q.length < 2) { setSearchError(t('friends.minChars')); return }
    setSearching(true)
    try {
      const results = await searchUsers(q)
      const filtered = results.filter(p => p.uid !== currentUser?.userId)
      setSearchResults(filtered)
      if (filtered.length === 0) setSearchError(t('friends.noPlayer'))
    } catch {
      setSearchError(t('friends.searchFailed'))
    } finally {
      setSearching(false)
    }
  }

  const handleSendRequest = useCallback(async (player) => {
    try {
      await sendFriendRequest(currentUser, player.uid, player.username)
      setSearchResults(null)
      setSearchQuery('')
    } catch (e) {
      setSearchError(e.message)
    }
  }, [currentUser])

  const isEmpty = accepted.length === 0 && pendingReceived.length === 0 && pendingSent.length === 0

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-white mb-1">{t('friends.title')}</h1>
        <p className="text-sm text-gray-500">{t('friends.subtitle')}</p>
      </div>

      {/* Freund hinzufügen */}
      <section className="bg-brand-surface border border-purple-900/30 rounded-2xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">{t('friends.addFriend')}</p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchResults(null); setSearchError('') }}
            placeholder={t('friends.searchPlaceholder')}
            className="flex-1 bg-brand-dark border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary"
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-brand-primary hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold px-5 rounded-xl transition-colors"
          >
            {searching ? '…' : t('common.search')}
          </button>
        </form>

        {searchError && <p className="text-xs text-red-400 mt-2">{searchError}</p>}

        {searchResults && searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map(p => {
              const already = knownIds.has(p.uid)
              return (
                <div key={p.uid} className="flex items-center justify-between gap-3 bg-brand-dark/40 border border-purple-900/20 rounded-xl px-4 py-3">
                  <button
                    onClick={() => setViewProfile({ userId: p.uid, username: p.username })}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                  >
                    <Avatar username={p.username} size="sm" />
                    <p className="text-sm font-semibold text-white truncate">{p.username}</p>
                  </button>
                  {already ? (
                    <span className="text-xs text-gray-500 shrink-0">{t('friends.alreadyConnected')}</span>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(p)}
                      className="bg-brand-primary hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      {t('friends.sendRequest')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {isEmpty && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-sm">{t('friends.noFriendsYet')}</p>
          <p className="text-gray-700 text-xs mt-1">{t('friends.searchHint')}</p>
        </div>
      )}

      {/* Eingehende Anfragen */}
      <Section title={t('friends.incoming')} count={pendingReceived.length}>
        {pendingReceived.map(f => {
          const peer = peerOf(f, currentUser?.userId)
          const displayPeer = { ...peer, username: freshNames[peer.userId] ?? peer.username }
          return (
            <FriendRow
              key={f.docId}
              peer={displayPeer}
              onViewProfile={(uid, username) => setViewProfile({ userId: uid, username })}
              onAction={
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => acceptFriendRequest(f.docId)}
                    className="bg-brand-accent hover:bg-emerald-400 text-brand-dark text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(f.docId)}
                    className="border border-red-800/50 hover:border-red-500 text-red-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              }
            />
          )
        })}
      </Section>

      {/* Gesendete Anfragen */}
      <Section title={t('friends.sent')} count={pendingSent.length}>
        {pendingSent.map(f => {
          const peer = peerOf(f, currentUser?.userId)
          const displayPeer = { ...peer, username: freshNames[peer.userId] ?? peer.username }
          return (
            <FriendRow
              key={f.docId}
              peer={displayPeer}
              onViewProfile={(uid, username) => setViewProfile({ userId: uid, username })}
              onAction={
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-600">{t('common.pending')}</span>
                  <button
                    onClick={() => cancelFriendRequest(f.docId)}
                    className="border border-red-800/50 hover:border-red-500 text-red-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              }
            />
          )
        })}
      </Section>

      {/* Akzeptierte Freunde */}
      <Section title={t('friends.title')} count={accepted.length}>
        {accepted.map(f => {
          const peer = peerOf(f, currentUser?.userId)
          const displayPeer = { ...peer, username: freshNames[peer.userId] ?? peer.username }
          return (
            <FriendRow
              key={f.docId}
              peer={displayPeer}
              onViewProfile={(uid, username) => setViewProfile({ userId: uid, username, isFriend: true })}
              onAction={
                <button
                  onClick={() => removeFriend(f.docId)}
                  className="text-xs text-gray-700 hover:text-red-400 transition-colors shrink-0"
                >
                  {t('common.remove')}
                </button>
              }
            />
          )
        })}
      </Section>

      {viewProfile && (
        <PlayerProfileCard
          userId={viewProfile.userId}
          fallbackUsername={viewProfile.username}
          isFriend={viewProfile.isFriend ?? false}
          onClose={() => setViewProfile(null)}
        />
      )}

    </div>
  )
}
