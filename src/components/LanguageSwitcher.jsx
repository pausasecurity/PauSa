import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'de', flag: '🇩🇪' },
  { code: 'en', flag: '🇬🇧' },
  { code: 'tr', flag: '🇹🇷' },
  { code: 'fr', flag: '🇫🇷' },
  { code: 'es', flag: '🇪🇸' },
  { code: 'it', flag: '🇮🇹' },
  { code: 'pl', flag: '🇵🇱' },
  { code: 'ru', flag: '🇷🇺' },
  { code: 'pt', flag: '🇵🇹' },
]

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  const current = LANGUAGES.find(l => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0]

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 150 }}>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
          background: '#1A1A2E',
          border: '1px solid rgba(107, 33, 168, 0.4)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          minWidth: 160,
        }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 14px',
                background: lang.code === i18n.resolvedLanguage ? 'rgba(107, 33, 168, 0.2)' : 'none',
                border: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                color: lang.code === i18n.resolvedLanguage ? '#FAFAFA' : '#A1A1AA',
                textAlign: 'left',
                transition: 'background 120ms ease-out, color 120ms ease-out',
              }}
              onMouseEnter={e => { if (lang.code !== i18n.resolvedLanguage) { e.currentTarget.style.background = 'rgba(107,33,168,0.1)'; e.currentTarget.style.color = '#FAFAFA' } }}
              onMouseLeave={e => { if (lang.code !== i18n.resolvedLanguage) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#A1A1AA' } }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{lang.flag}</span>
              <span>{t(`lang.${lang.code}`)}</span>
              {lang.code === i18n.resolvedLanguage && (
                <span style={{ marginLeft: 'auto', color: '#9B1631', fontSize: 11 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        title="Language / Sprache"
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: open ? '#1A1A2E' : 'rgba(26,26,46,0.9)',
          border: `1px solid ${open ? 'rgba(107,33,168,0.6)' : 'rgba(107,33,168,0.3)'}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          transition: 'border-color 150ms ease-out, background 150ms ease-out',
          backdropFilter: 'blur(8px)',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = 'rgba(107,33,168,0.7)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'rgba(107,33,168,0.3)' }}
      >
        {current.flag}
      </button>
    </div>
  )
}
