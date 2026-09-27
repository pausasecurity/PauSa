import React, { useState } from 'react'
import { saveRating, markSessionRated } from '../services/ratingService'
import { sanitizeText } from '../utils/sanitize'
import { useTranslation } from 'react-i18next'

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="text-2xl transition-transform hover:scale-110 focus:outline-none"
        >
          <span className={(hovered || value) >= n ? 'text-yellow-400' : 'text-gray-700'}>★</span>
        </button>
      ))}
    </div>
  )
}

export default function RatingModal({ lobby, currentUser, onClose }) {
  const { t } = useTranslation()
  const targets = lobby.members.filter(m => m.userId !== currentUser.userId)

  const [stars,    setStars]    = useState({})
  const [comments, setComments] = useState({})
  const [done,     setDone]     = useState(false)
  const [saving,   setSaving]   = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await Promise.all(
        targets
          .filter(m => stars[m.userId])
          .map(m => saveRating(
            lobby.lobbyId,
            currentUser.userId,
            m.userId,
            m.username,
            stars[m.userId],
            sanitizeText(comments[m.userId] ?? '', 200),
          ))
      )
      markSessionRated(lobby.lobbyId, currentUser.userId)
      setDone(true)
    } catch {
      setSaving(false)
    }
  }

  const canSubmit = targets.some(m => stars[m.userId])

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-brand-card border border-purple-900/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {done ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">⭐</div>
            <h2 className="text-xl font-bold text-white mb-2">{t('rating.thanks')}</h2>
            <p className="text-gray-400 text-sm mb-6">{t('rating.helpText')}</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-brand-accent hover:bg-emerald-400 text-brand-dark font-bold text-sm transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 pt-6 pb-4 border-b border-purple-900/30">
              <h2 className="text-lg font-bold text-white">{t('rating.title')}</h2>
              <p className="text-gray-500 text-sm mt-0.5">{t('rating.subtitle')}</p>
            </div>

            <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
              {targets.map(m => (
                <div key={m.userId} className="bg-brand-dark/60 border border-purple-900/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-xs font-bold text-white">
                      {m.username[0]}
                    </div>
                    <span className="text-sm font-semibold text-white">{m.username}</span>
                  </div>
                  <StarPicker
                    value={stars[m.userId] ?? 0}
                    onChange={v => setStars(prev => ({ ...prev, [m.userId]: v }))}
                  />
                  {stars[m.userId] > 0 && (
                    <textarea
                      value={comments[m.userId] ?? ''}
                      onChange={e => setComments(prev => ({ ...prev, [m.userId]: e.target.value }))}
                      placeholder={t('rating.comment')}
                      maxLength={200}
                      rows={2}
                      className="mt-3 w-full bg-brand-surface border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-brand-primary"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-purple-900/30 flex gap-3 justify-end">
              <button
                onClick={() => { markSessionRated(lobby.lobbyId, currentUser.userId); onClose() }}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors px-4 py-2"
              >
                {t('common.skip')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || saving}
                className="px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:bg-gray-800 disabled:text-gray-600 bg-brand-primary hover:bg-purple-500 text-white"
              >
                {saving ? t('rating.saving') : t('rating.submit')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
