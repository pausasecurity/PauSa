import React, { useState } from 'react'
import { setNewPassword, validatePassword, authError } from '../services/authService'

const inputStyle = (hasError) => ({
  width: '100%', boxSizing: 'border-box',
  background: '#0F0F1A',
  border: `1px solid ${hasError ? '#9B1631' : '#374151'}`,
  borderRadius: 8, padding: '10px 12px',
  fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#FAFAFA',
  outline: 'none',
})

const labelStyle = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 11, fontWeight: 500, color: '#71717A',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginBottom: 6,
}

// Erscheint nach Klick auf den Passwort-Reset-Link aus der E-Mail (Supabase-Event PASSWORD_RECOVERY)
export default function PasswordResetModal({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [saved,    setSaved]    = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const pwErr = validatePassword(password)
    if (pwErr)                  { setError(pwErr); return }
    if (password !== confirm)   { setError('Passwörter stimmen nicht überein.'); return }
    setError(null)
    setLoading(true)
    try {
      await setNewPassword(password)
      setSaved(true)
    } catch (err) {
      setError(authError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Neues Passwort festlegen"
      style={{
        position: 'fixed', inset: 0, zIndex: 98,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px', background: 'rgba(14,14,15,0.8)', backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        background: '#1A1A2E', border: '1px solid rgba(107, 33, 168, 0.5)', borderRadius: 16,
        width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(76, 29, 149, 0.3)' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500, color: '#FAFAFA', margin: 0 }}>
            Neues Passwort festlegen
          </p>
        </div>

        {saved ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#A1A1AA', margin: 0, lineHeight: 1.6 }}>
              ✓ Dein Passwort wurde geändert. Du bist jetzt eingeloggt.
            </p>
            <button type="button" onClick={onDone} style={buttonStyle(false)}>Weiter</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="new-password" style={labelStyle}>Neues Passwort</label>
              <input
                id="new-password" type="password" autoFocus autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)}
                style={inputStyle(!!error)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" style={labelStyle}>Passwort wiederholen</label>
              <input
                id="confirm-password" type="password" autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                style={inputStyle(!!error)}
              />
            </div>
            {error && (
              <p role="alert" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#B52240', margin: 0 }}>
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} style={buttonStyle(loading)}>
              {loading ? 'Speichere…' : 'Passwort speichern'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function buttonStyle(disabled) {
  return {
    background: '#9B1631', color: '#FAFAFA', border: 'none', borderRadius: 8,
    padding: '11px 16px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
  }
}
