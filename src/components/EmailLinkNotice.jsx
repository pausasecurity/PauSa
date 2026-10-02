import React from 'react'

const MESSAGES = {
  signup:       { icon: '✅', title: 'E-Mail bestätigt',        body: 'Dein Konto ist aktiviert. Viel Spaß bei PauSa!' },
  email:        { icon: '✅', title: 'E-Mail bestätigt',        body: 'Dein Konto ist aktiviert. Viel Spaß bei PauSa!' },
  email_change: { icon: '✅', title: 'Bestätigung angenommen', body: 'Falls du auch eine Mail an die andere Adresse bekommen hast, bestätige sie ebenfalls. Erst dann ist die Änderung aktiv.' },
}

const text = { fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#A1A1AA', margin: 0, lineHeight: 1.6 }

// Ergebnis nach Klick auf einen Link aus einer Auth-Mail (/auth/confirm). Recovery zeigt stattdessen PasswordResetModal.
export default function EmailLinkNotice({ type, error, onClose }) {
  const msg = error
    ? { icon: '⚠️', title: 'Link ungültig', body: `${error} Fordere bei Bedarf eine neue Mail an.` }
    : MESSAGES[type]
  if (!msg) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-link-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 98,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px', background: 'rgba(14,14,15,0.8)', backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1A1A2E', border: '1px solid rgba(107, 33, 168, 0.5)', borderRadius: 16,
          width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          padding: 24, display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 44 }} aria-hidden="true">{msg.icon}</div>
        <p id="email-link-title" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: '#FAFAFA', margin: 0 }}>
          {msg.title}
        </p>
        <p style={text}>{msg.body}</p>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          style={{
            background: '#9B1631', color: '#FAFAFA', border: 'none', borderRadius: 8,
            padding: '11px 16px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          OK
        </button>
      </div>
    </div>
  )
}
