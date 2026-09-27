import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useVerification } from '../context/VerificationContext'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'

export default function Navbar({ currentView, onNavigate, onLoginClick, onCreateLobby }) {
  const { isVerified, verificationRequired } = useVerification()
  const { isLoggedIn, currentUser, logout }  = useAuth()
  const { t } = useTranslation()
  const [showUserMenu, setShowUserMenu]      = useState(false)
  const [confirmLogout, setConfirmLogout]    = useState(false)

  const NAV_LINKS = [
    { key: 'lobby',   label: t('nav.lobbies') },
    { key: 'friends', label: t('nav.friends') },
    { key: 'clans',   label: t('nav.clans'),  disabled: true },
    { key: 'groups',  label: t('nav.groups')  },
    { key: 'profile', label: t('nav.profile') },
    { key: 'account', label: t('nav.account') },
  ]

  const initials = currentUser?.username?.[0]?.toUpperCase() ?? '?'

  // ── EINGELOGGT: Banner-Design ────────────────────────────────────────────
  if (isLoggedIn) {
    return (
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: 80,
          backgroundImage: 'url(/pausa-banner.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          className="h-full flex items-center"
          style={{ padding: '0 24px' }}
        >
          {/* Logo */}
          <button
            onClick={() => onNavigate('lobby')}
            className="shrink-0 select-none flex items-center"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <img
              src="/pausa-logo.png"
              alt="PauSa"
              style={{ height: 50, objectFit: 'contain', display: 'block' }}
            />
          </button>

          {/* Slogan – füllt den Mittelbereich */}
          <div className="flex-1 hidden md:block" style={{ paddingLeft: 20, userSelect: 'none' }}>
            <div style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontStyle: 'italic',
              lineHeight: 1.2,
            }}>
              <div>
                <span style={{ fontSize: 15, color: '#FFAB00', textShadow: '0 1px 6px rgba(0,0,0,0.85)' }}>
                  Find your game.
                </span>
              </div>
              <div>
                <span style={{ fontSize: 15, color: '#A8FF00', textShadow: '0 1px 6px rgba(0,0,0,0.85)' }}>
                  Dominate the Squad!
                </span>
              </div>
            </div>
          </div>

          {/* Rechts: NavLinks + + Lobby + Avatar */}
          <div className="flex items-center gap-1.5">

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-0.5">
              {NAV_LINKS.map(({ key, label, disabled }) => (
                <button
                  key={key}
                  onClick={() => !disabled && onNavigate(key)}
                  disabled={disabled}
                  className="px-3 py-1.5 rounded-md"
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13,
                    fontWeight: currentView === key ? 500 : 400,
                    color:      disabled ? 'rgba(255,255,255,0.3)' : '#FAFAFA',
                    background: currentView === key
                      ? 'rgba(0,0,0,0.60)'
                      : 'rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(8px)',
                    border: currentView === key
                      ? '1px solid rgba(255,255,255,0.22)'
                      : '1px solid rgba(255,255,255,0.08)',
                    cursor:     disabled ? 'default' : 'pointer',
                    transition: 'background 120ms ease-out, border-color 120ms ease-out',
                  }}
                  onMouseEnter={e => {
                    if (!disabled && currentView !== key) {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.55)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!disabled && currentView !== key) {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.35)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                    }
                  }}
                >
                  {label}
                  {disabled && <span style={{ fontSize: 9, marginLeft: 4, color: 'rgba(255,255,255,0.3)' }}>{t('nav.soon')}</span>}
                </button>
              ))}
            </div>

            {/* + Lobby */}
            <motion.button
              onClick={onCreateLobby}
              className="hidden sm:block px-3 py-1.5 rounded-md text-white"
              style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
                background: '#9B1631', minHeight: 44, marginLeft: 6,
                transition: 'background 150ms ease-out',
              }}
              whileTap={{ scale: 0.95, transition: { duration: 0.1, ease: 'easeOut' } }}
              onMouseEnter={e => e.currentTarget.style.background = '#B52240'}
              onMouseLeave={e => e.currentTarget.style.background = '#9B1631'}
            >
              {t('nav.createLobby')}
            </motion.button>

            {/* User Avatar */}
            <div className="relative" style={{ marginLeft: 4 }}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                aria-label={`Benutzermenü für ${currentUser?.username ?? 'Profil'}`}
                aria-expanded={showUserMenu}
                aria-haspopup="menu"
                className="flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, minHeight: 44, background: '#1A2744', border: '2px solid #2E3F62' }}
              >
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500, color: '#8BA3D4' }}>
                  {initials}
                </span>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-0" onClick={() => { setShowUserMenu(false); setConfirmLogout(false) }} />
                  <div
                    role="menu"
                    aria-label="Benutzermenü"
                    className="absolute right-0 top-full mt-2 w-44 z-10 overflow-hidden"
                    style={{ background: '#1A1A1C', border: '0.5px solid #3F3F46', borderRadius: 10 }}
                  >
                    {[
                      { label: t('nav.myProfile'), key: 'profile' },
                      { label: t('nav.friends'),   key: 'friends' },
                    ].map(item => (
                      <button
                        key={item.key}
                        role="menuitem"
                        onClick={() => { onNavigate(item.key); setShowUserMenu(false) }}
                        className="w-full text-left px-4 py-2.5 transition-colors"
                        style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#A1A1AA' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#FAFAFA'; e.currentTarget.style.background = '#27272A' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#A1A1AA'; e.currentTarget.style.background = 'transparent' }}
                      >
                        {item.label}
                      </button>
                    ))}
                    <div style={{ borderTop: '0.5px solid #3F3F46' }} />
                    {confirmLogout ? (
                      <div className="px-4 py-2.5 space-y-2">
                        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#A1A1AA' }}>{t('nav.confirmLogout')}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { logout(); setShowUserMenu(false); setConfirmLogout(false) }}
                            className="flex-1 rounded-md py-1 text-xs font-semibold transition-colors bg-red-600 hover:bg-red-500 text-white"
                          >{t('common.yes')}</button>
                          <button
                            onClick={() => setConfirmLogout(false)}
                            className="flex-1 rounded-md py-1 text-xs font-semibold transition-colors bg-zinc-700 hover:bg-zinc-600 text-white"
                          >{t('common.no')}</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        role="menuitem"
                        onClick={() => setConfirmLogout(true)}
                        className="w-full text-left px-4 py-2.5 transition-colors"
                        style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#A1A1AA' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#FAFAFA'; e.currentTarget.style.background = '#27272A' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#A1A1AA'; e.currentTarget.style.background = 'transparent' }}
                      >
                        {t('nav.logout')}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    )
  }

  // ── AUSGELOGGT: dunkle Leiste ─────────────────────────────────────────────
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{ height: 56, background: '#1A1A1C', borderBottom: '0.5px solid #3F3F46' }}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-4">

        <button
          onClick={() => onNavigate('lobby')}
          className="shrink-0 select-none flex items-center"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <img
            src="/pausa-logo.png"
            alt="PauSa"
            style={{ height: 38, objectFit: 'contain', display: 'block' }}
          />
        </button>

        <div className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ key, label, disabled }) => (
            <button
              key={key}
              onClick={() => !disabled && onNavigate(key)}
              disabled={disabled}
              className="px-3 py-1.5 rounded-md transition-colors"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                fontWeight: currentView === key ? 500 : 400,
                color:      disabled ? '#52525B' : currentView === key ? '#FAFAFA' : '#A1A1AA',
                background: currentView === key ? '#27272A' : 'transparent',
                cursor:     disabled ? 'default' : 'pointer',
              }}
            >
              {label}
              {disabled && <span style={{ fontSize: 9, marginLeft: 4, color: '#52525B' }}>{t('nav.soon')}</span>}
            </button>
          ))}
        </div>

        <motion.button
          onClick={onLoginClick}
          className="px-4 py-1.5 rounded-md text-white"
          style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
            background: '#9B1631', minHeight: 44,
            transition: 'background 150ms ease-out',
          }}
          whileTap={{ scale: 0.95, transition: { duration: 0.1, ease: 'easeOut' } }}
          onMouseEnter={e => e.currentTarget.style.background = '#B52240'}
          onMouseLeave={e => e.currentTarget.style.background = '#9B1631'}
        >
          {t('nav.login')}
        </motion.button>
      </div>
    </nav>
  )
}
