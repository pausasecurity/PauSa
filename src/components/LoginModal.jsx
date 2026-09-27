import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { authError, resetPassword } from '../services/authService'
import { useTranslation } from 'react-i18next'

const EASE = [0.23, 1, 0.32, 1]

const inputStyle = (hasError) => ({
  width: '100%', boxSizing: 'border-box',
  background: '#0F0F1A',
  border: `1px solid ${hasError ? '#9B1631' : '#374151'}`,
  borderRadius: 8, padding: '10px 12px',
  fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#FAFAFA',
  outline: 'none',
  transition: 'border-color 150ms ease-out',
})

const labelStyle = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 11, fontWeight: 500, color: '#71717A',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginBottom: 6,
}

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export default function LoginModal({ onClose, onSuccess, onRegister }) {
  const { t } = useTranslation()
  const { login }               = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login(email.trim(), password, rememberMe)
      onSuccess?.(user)
      onClose()
    } catch (err) {
      setError(authError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await resetPassword(email.trim())
      setResetSent(true)
    } catch (err) {
      setError(authError(err))
    } finally {
      setLoading(false)
    }
  }

  const backToLogin = () => {
    setForgotMode(false)
    setResetSent(false)
    setError(null)
  }

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.15 } }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 97,
          background: 'rgba(14,14,15,0.8)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <motion.div
        key="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Einloggen"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: EASE } }}
        exit={{ opacity: 0, scale: 0.96, y: 4, transition: { duration: 0.14 } }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', inset: 0, zIndex: 98,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 16px', pointerEvents: 'none',
        }}
      >
        <div style={{
          background: '#1A1A2E',
          border: '1px solid rgba(107, 33, 168, 0.5)',
          borderRadius: 16,
          width: '100%', maxWidth: 400,
          pointerEvents: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(76, 29, 149, 0.3)',
          }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500, color: '#FAFAFA', margin: 0 }}>
              {forgotMode ? t('auth.resetTitle') : t('auth.login')}
            </p>
            <button
              onClick={onClose}
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
              <CloseIcon />
            </button>
          </div>

          {/* Form */}
          {forgotMode ? (
            <form onSubmit={handleReset} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {resetSent ? (
                <>
                  <p style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#A1A1AA',
                    margin: 0, lineHeight: 1.6,
                  }}>
                    {t('auth.resetSentTo')} <span style={{ color: '#FAFAFA' }}>{email.trim()}</span>.<br />
                    {t('auth.checkMailbox')}
                  </p>
                  <button
                    type="button"
                    onClick={backToLogin}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                      color: '#9B1631', textAlign: 'left', padding: 0,
                      transition: 'color 120ms ease-out',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#B52240'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9B1631'}
                  >
                    {t('auth.backToLogin')}
                  </button>
                </>
              ) : (
                <>
                  <p style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#A1A1AA',
                    margin: 0, lineHeight: 1.6,
                  }}>
                    {t('auth.resetDescription')}
                  </p>

                  <div>
                    <label htmlFor="reset-email" style={labelStyle}>{t('auth.email')}</label>
                    <input
                      id="reset-email"
                      type="email"
                      autoFocus
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                      required
                      style={inputStyle(!!error)}
                      onFocus={e => e.target.style.borderColor = '#9B1631'}
                      onBlur={e => e.target.style.borderColor = error ? '#9B1631' : '#374151'}
                    />
                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0, transition: { duration: 0.15, ease: EASE } }}
                          exit={{ opacity: 0 }}
                          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#B52240', marginTop: 6 }}
                          role="alert"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || !email.trim()}
                    whileTap={!loading ? { scale: 0.97, transition: { duration: 0.1 } } : {}}
                    style={{
                      width: '100%', padding: '11px 0',
                      background: (!email.trim() || loading) ? '#27272A' : '#9B1631',
                      color: (!email.trim() || loading) ? '#555555' : '#FAFAFA',
                      border: 'none', borderRadius: 8,
                      fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
                      cursor: (!email.trim() || loading) ? 'not-allowed' : 'pointer',
                      transition: 'background 150ms ease-out, color 150ms ease-out',
                      minHeight: 44,
                    }}
                    onMouseEnter={e => { if (!loading && email.trim()) e.currentTarget.style.background = '#B52240' }}
                    onMouseLeave={e => { if (!loading && email.trim()) e.currentTarget.style.background = '#9B1631' }}
                  >
                    {loading ? t('auth.sending') : t('auth.sendResetLink')}
                  </motion.button>

                  <button
                    type="button"
                    onClick={backToLogin}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                      color: '#555555', textAlign: 'center',
                      transition: 'color 120ms ease-out',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#A1A1AA'}
                    onMouseLeave={e => e.currentTarget.style.color = '#555555'}
                  >
                    {t('auth.backToLogin')}
                  </button>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* E-Mail */}
              <div>
                <label htmlFor="login-email" style={labelStyle}>{t('auth.email')}</label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoFocus
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  style={inputStyle(false)}
                  onFocus={e => e.target.style.borderColor = '#9B1631'}
                  onBlur={e => e.target.style.borderColor = '#374151'}
                />
              </div>

              {/* Passwort */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label htmlFor="login-pw" style={{ ...labelStyle, marginBottom: 0 }}>{t('auth.password')}</label>
                  <button
                    type="button"
                    onClick={() => { setError(null); setForgotMode(true) }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 11,
                      color: '#555555',
                      transition: 'color 120ms ease-out',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#9B1631'}
                    onMouseLeave={e => e.currentTarget.style.color = '#555555'}
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
                <input
                  id="login-pw"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  style={inputStyle(!!error)}
                  onFocus={e => e.target.style.borderColor = '#9B1631'}
                  onBlur={e => e.target.style.borderColor = error ? '#9B1631' : '#374151'}
                />
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0, transition: { duration: 0.15, ease: EASE } }}
                      exit={{ opacity: 0 }}
                      style={{
                        fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                        color: '#B52240', marginTop: 6,
                      }}
                      role="alert"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Eingeloggt bleiben */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#9B1631', width: 15, height: 15, cursor: 'pointer' }}
                />
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#A1A1AA',
                }}>
                  {t('auth.rememberMe')}
                </span>
              </label>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading || !email.trim() || !password}
                whileTap={!loading ? { scale: 0.97, transition: { duration: 0.1 } } : {}}
                style={{
                  width: '100%', padding: '11px 0',
                  background: (!email.trim() || !password || loading) ? '#27272A' : '#9B1631',
                  color: (!email.trim() || !password || loading) ? '#555555' : '#FAFAFA',
                  border: 'none', borderRadius: 8,
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
                  cursor: (!email.trim() || !password || loading) ? 'not-allowed' : 'pointer',
                  transition: 'background 150ms ease-out, color 150ms ease-out',
                  minHeight: 44,
                }}
                onMouseEnter={e => { if (!loading && email.trim() && password) e.currentTarget.style.background = '#B52240' }}
                onMouseLeave={e => { if (!loading && email.trim() && password) e.currentTarget.style.background = '#9B1631' }}
              >
                {loading ? t('auth.checking') : t('auth.login')}
              </motion.button>

              {/* Register link */}
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                color: '#555555', textAlign: 'center', margin: 0,
              }}>
                {t('auth.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => { onClose(); onRegister?.() }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                    color: '#9B1631',
                    transition: 'color 120ms ease-out',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#B52240'}
                  onMouseLeave={e => e.currentTarget.style.color = '#9B1631'}
                >
                  {t('auth.registerNow')}
                </button>
              </p>

            </form>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
