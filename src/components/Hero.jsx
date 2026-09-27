import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { subscribeToLobbies } from '../services/lobbyService'
import { GAMES } from '../data/games'
import { useTranslation } from 'react-i18next'

const EASE = [0.23, 1, 0.32, 1]

export default function Hero({ onLoginClick, onRegisterClick }) {
  const { isLoggedIn } = useAuth()
  const { t } = useTranslation()
  const [lobbies, setLobbies] = useState([])

  const FOOTER_LINKS = [
    { label: t('footer.imprint'), href: '/impressum'   },
    { label: t('footer.terms'),   href: '/agb'         },
    { label: t('footer.privacy'), href: '/datenschutz' },
    { label: t('footer.contact'), href: 'mailto:support@pau-sa.de' },
  ]

  useEffect(() => {
    if (isLoggedIn) return
    const unsub = subscribeToLobbies(setLobbies)
    return unsub
  }, [isLoggedIn])

  // Lock scroll while hero is visible
  useEffect(() => {
    if (isLoggedIn) return
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [isLoggedIn])

  if (isLoggedIn) return null

  const playerCount = lobbies.reduce((sum, l) => sum + l.members.length, 0)
  const lobbyCount  = lobbies.length
  const gameCount   = GAMES.length

  return (
    <section style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10,
      overflow: 'hidden',
    }}>

      {/* Full-screen artwork */}
      <img
        src="/artwork.png"
        alt="PauSa"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center center',
          display: 'block',
        }}
      />

      {/* Gradient for bottom readability */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 80%, rgba(0,0,0,0.65) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Login / Register buttons */}
      <div style={{
        position: 'absolute', top: 18, right: 18,
        display: 'flex', gap: 10, zIndex: 2,
      }}>
        <motion.button
          onClick={onLoginClick}
          whileTap={{ scale: 0.96, transition: { duration: 0.08 } }}
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(10px)',
            border: '1.5px solid rgba(255,255,255,0.28)',
            color: '#FAFAFA',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14, fontWeight: 500,
            padding: '10px 24px', borderRadius: 9,
            minHeight: 44, cursor: 'pointer',
            transition: 'background 150ms ease-out, border-color 150ms ease-out',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.75)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.55)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'
          }}
        >
          {t('nav.login')}
        </motion.button>

        <motion.button
          onClick={onRegisterClick}
          whileTap={{ scale: 0.96, transition: { duration: 0.08 } }}
          style={{
            background: '#9B1631',
            border: '1.5px solid #9B1631',
            color: '#FAFAFA',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14, fontWeight: 600,
            padding: '10px 24px', borderRadius: 9,
            minHeight: 44, cursor: 'pointer',
            transition: 'background 150ms ease-out',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#B52240'}
          onMouseLeave={e => e.currentTarget.style.background = '#9B1631'}
        >
          {t('nav.register')}
        </motion.button>
      </div>

      {/* Stats + Description — above PAUSA lettering on desktop, bottom on mobile */}
      <div className="hero-boxes">

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.15, duration: 0.28, ease: EASE } }}
          style={{
            background: 'rgba(0,0,0,0.62)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 14,
            padding: '14px 12px',
            display: 'flex', flexWrap: 'wrap',
            justifyContent: 'center', gap: 0,
          }}
        >
          {[
            { label: t('hero.playersOnline'), value: playerCount > 0 ? playerCount.toLocaleString() : '—' },
            { label: t('hero.activeLobbies'),  value: lobbyCount  > 0 ? lobbyCount                  : '—' },
            { label: t('hero.games'),          value: `${gameCount}+` },
          ].map((s, i, arr) => (
            <React.Fragment key={s.label}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, padding: '2px 18px' }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#FAFAFA' }}>
                  {s.value}
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#A1A1AA' }}>
                  {s.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: 1, background: 'rgba(255,255,255,0.10)', margin: '6px 0' }} />
              )}
            </React.Fragment>
          ))}
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.26, duration: 0.25, ease: EASE } }}
          style={{
            background: 'rgba(0,0,0,0.62)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 14,
            padding: '14px 22px',
          }}
        >
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14, color: '#E4E4E7',
            lineHeight: 1.65, margin: 0,
          }}>
            {t('hero.tagline')}
          </p>
        </motion.div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.70)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '11px 24px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 28, flexWrap: 'wrap',
        zIndex: 2,
      }}>
        {FOOTER_LINKS.map(link => (
          <a
            key={link.label}
            href={link.href}
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 12, color: '#71717A',
              textDecoration: 'none',
              transition: 'color 120ms ease-out',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#FAFAFA'}
            onMouseLeave={e => e.currentTarget.style.color = '#71717A'}
          >
            {link.label}
          </a>
        ))}
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#3F3F46' }}>
          © {new Date().getFullYear()} PauSa
        </span>
      </div>
    </section>
  )
}
