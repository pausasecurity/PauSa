import React, { useState } from 'react'
import { resendConfirmation, authError } from '../services/authService'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'

const text = { fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#A1A1AA', margin: 0, lineHeight: 1.6 }

// Nach der Registrierung: Konto ist erst nach Klick auf den Bestätigungslink aktiv
export default function EmailConfirmModal({ email, inviteLink, onClose }) {
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | Fehlertext
  const [copied, copy]      = useCopyToClipboard()

  const handleResend = async () => {
    setStatus('sending')
    try {
      await resendConfirmation(email)
      setStatus('sent')
    } catch (err) {
      setStatus(authError(err))
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-confirm-title"
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
        <div style={{ fontSize: 44 }} aria-hidden="true">📬</div>
        <p id="email-confirm-title" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: '#FAFAFA', margin: 0 }}>
          Bitte bestätige deine E-Mail-Adresse
        </p>
        <p style={text}>
          Wir haben dir einen Bestätigungslink an<br />
          <span style={{ color: '#FAFAFA', fontWeight: 500 }}>{email}</span><br />
          geschickt. Klicke auf den Link, um dein Konto zu aktivieren – danach kannst du dich einloggen.
        </p>
        <p style={{ ...text, fontSize: 12, color: '#71717A' }}>
          Keine Mail bekommen? Schau auch im Spam-Ordner nach.
        </p>

        {inviteLink && (
          <div style={{ background: 'rgba(113,63,18,0.2)', border: '1px solid rgba(161,98,7,0.4)', borderRadius: 12, padding: 12, textAlign: 'left' }}>
            <p style={{ ...text, fontSize: 11, color: '#FACC15', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              🔗 Clan-Einladungslink
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: '#FEF08A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                {inviteLink}
              </span>
              <button type="button" onClick={() => copy(inviteLink)} style={secondaryButton}>
                {copied ? '✓ Kopiert' : 'Kopieren'}
              </button>
            </div>
          </div>
        )}

        {status && status !== 'sending' && (
          <p role="status" style={{ ...text, fontSize: 12, color: status === 'sent' ? '#4ADE80' : '#B52240' }}>
            {status === 'sent' ? '✓ Mail wurde erneut gesendet.' : status}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleResend}
            disabled={status === 'sending' || status === 'sent'}
            style={{ ...secondaryButton, flex: 1, opacity: status === 'sending' || status === 'sent' ? 0.5 : 1 }}
          >
            {status === 'sending' ? 'Sende…' : 'Mail erneut senden'}
          </button>
          <button type="button" onClick={onClose} autoFocus style={{ ...primaryButton, flex: 1 }}>
            Verstanden
          </button>
        </div>
      </div>
    </div>
  )
}

const primaryButton = {
  background: '#9B1631', color: '#FAFAFA', border: 'none', borderRadius: 8,
  padding: '11px 16px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

const secondaryButton = {
  background: 'transparent', color: '#D4D4D8', border: '1px solid #374151', borderRadius: 8,
  padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
}
