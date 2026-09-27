import React, { useState } from 'react'
import { submitReport, REPORT_REASONS } from '../services/reportService'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'

// target: { type: 'profile'|'group'|'clan'|'message', id: string, name: string }
export default function ReportModal({ target, onClose }) {
  const { currentUser } = useAuth()
  const { t } = useTranslation()

  const TYPE_LABELS = {
    profile: t('report.profile'),
    group:   t('report.group'),
    clan:    t('report.clan'),
    message: t('report.chatMessage'),
    lobby:   t('report.lobby'),
  }
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [error,  setError]  = useState(null)
  const [done,   setDone]   = useState(false)

  const handleSubmit = () => {
    if (!reason) { setError('Bitte einen Grund auswählen.'); return }
    setError(null)
    try {
      submitReport({
        type:       target.type,
        targetId:   target.id,
        targetName: target.name,
        reason,
        detail,
        reportedBy: currentUser?.userId ?? 'anonymous',
      })
      setDone(true)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#1A1A2E] border border-red-900/40 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        <div className="bg-brand-surface px-6 py-4 border-b border-red-900/30 flex items-center justify-between">
          <p className="text-sm font-bold text-white">
            ⚑ {TYPE_LABELS[target.type] ?? target.type} melden
          </p>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg transition-colors">✕</button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-white font-semibold">{t('report.submitted')}</p>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              {t('report.submittedText')}
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2 rounded-xl text-sm font-semibold bg-brand-primary hover:bg-purple-500 text-white transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">

            {/* Ziel-Vorschau */}
            <div className="bg-brand-dark/60 border border-gray-800 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">
                {TYPE_LABELS[target.type] ?? target.type}
              </p>
              <p className="text-sm text-white font-semibold truncate">{target.name}</p>
            </div>

            {/* Grund */}
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 uppercase tracking-widest">{t('report.reason')}</p>
              {REPORT_REASONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    reason === r.value
                      ? 'border-red-700/60 bg-red-900/20 text-white'
                      : 'border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full border-2 shrink-0 transition-colors ${
                    reason === r.value ? 'border-red-500 bg-red-500' : 'border-gray-600'
                  }`} />
                  <span className="text-sm">{r.label}</span>
                </button>
              ))}
            </div>

            {/* Details */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{t('report.details')}</p>
              <textarea
                rows={2}
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder={t('report.detailsPlaceholder')}
                maxLength={300}
                className="w-full bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-red-700/50 placeholder-gray-600"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-red-700/70 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {t('report.submitBtn')}
              </button>
              <button
                onClick={onClose}
                className="flex-1 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
