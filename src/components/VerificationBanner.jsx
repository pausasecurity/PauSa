import React, { useState, useRef, useEffect } from 'react'
import { useVerification } from '../context/VerificationContext'
import { useTranslation } from 'react-i18next'

// SICHERHEITSHINWEIS (Implementierungspflicht für Produktion):
// Das hochgeladene Bilddokument darf zu KEINEM Zeitpunkt im React-State,
// im localStorage, im sessionStorage oder im Arbeitsspeicher über den
// Prüfvorgang hinaus verbleiben. Unmittelbar nach dem serverseitigen
// Alterscheck muss das Rohmaterial unwiderruflich gelöscht werden.
// Einziges persistiertes Ergebnis ist das boolean-Flag isVerified = true.
// PLACEHOLDER: Backend-Endpunkt für sicheres Dokument-Hashing + sofortige Löschung

export default function VerificationBanner() {
  const { verificationRequired, setIsVerified } = useVerification()
  const { t } = useTranslation()
  const UPLOAD_STEPS = [
    { label: t('verification.transferring'), pct: 30 },
    { label: t('verification.checking'),     pct: 65 },
    { label: t('verification.completed'),    pct: 100 },
  ]
  const [phase, setPhase]       = useState('idle')    // 'idle' | 'uploading' | 'done'
  const [progress, setProgress] = useState(0)
  const [stepLabel, setStepLabel] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const fileInputRef   = useRef(null)
  const intervalRef    = useRef(null)
  const finalTimerRef  = useRef(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current)   clearInterval(intervalRef.current)
      if (finalTimerRef.current) clearTimeout(finalTimerRef.current)
    }
  }, [])

  if (!verificationRequired || dismissed) return null
  if (phase === 'done') return null

  const runSimulatedCheck = () => {
    // PLACEHOLDER: FILE_INPUT – echtes Datei-Objekt via <input type="file" accept="image/*,.pdf">
    // Das File-Objekt wird per FormData an den Backend-Endpunkt geschickt.
    // Die Referenz auf das File-Objekt wird nach dem fetch() sofort auf null gesetzt.
    setPhase('uploading')
    let step = 0
    intervalRef.current = setInterval(() => {
      const current = UPLOAD_STEPS[step]
      setProgress(current.pct)
      setStepLabel(current.label)
      step++
      if (step >= UPLOAD_STEPS.length) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        finalTimerRef.current = setTimeout(() => {
          setPhase('done')
          setIsVerified(true)
        }, 500)
      }
    }, 900)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#1A1A2E] border border-purple-700/50 rounded-2xl shadow-2xl shadow-purple-900/40 w-full max-w-md p-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="font-bold text-white text-base leading-tight">{t('verification.title')}</p>
              <p className="text-xs text-purple-400 mt-0.5">{t('verification.subtitle')}</p>
            </div>
          </div>
          {phase === 'idle' && (
            <button
              onClick={() => setDismissed(true)}
              aria-label="Schließen"
              style={{
                color: '#71717A', background: 'none', border: 'none',
                cursor: 'pointer', minHeight: 44, minWidth: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 120ms ease-out',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#FAFAFA'}
              onMouseLeave={e => e.currentTarget.style.color = '#71717A'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Body Text */}
        <p className="text-sm text-gray-300 leading-relaxed mb-5">
          {t('verification.description')}
        </p>

        {/* PLACEHOLDER: Datei-Upload-Feld (sichtbar nach Klick auf "Jetzt verifizieren") */}
        {/* <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={...} /> */}

        {phase === 'idle' && (
          <button
            onClick={runSimulatedCheck}
            className="w-full bg-brand-primary hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {t('verification.verify')}
          </button>
        )}

        {phase === 'uploading' && (
          <div className="space-y-3">
            {/* Fortschrittsbalken */}
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-accent transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{stepLabel}</p>
              <p className="text-xs text-gray-600 font-mono">{progress}%</p>
            </div>
            <p className="text-xs text-gray-600 italic">
              {t('verification.deleteNote')}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-gray-600 mt-4 text-center">
          {t('verification.privacyNote')}
        </p>
      </div>
    </div>
  )
}
