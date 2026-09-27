import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const EASE = [0.23, 1, 0.32, 1]

// SVG icons — no emojis
const LobbyIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="2" y="3" width="16" height="12" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
    <path d="M7 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="10" cy="9" r="2" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const GroupsIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="7.5" cy="7" r="2.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
    <circle cx="13" cy="7" r="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
    <path d="M2 16c0-2.76 2.46-5 5.5-5s5.5 2.24 5.5 5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
    <path d="M14 11c1.5.5 3 1.8 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const ProfileIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
    <path d="M3 18c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
  </svg>
)

const FriendsIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="7.5" cy="7" r="2.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
    <path d="M2 16c0-2.76 2.46-5 5.5-5s5.5 2.24 5.5 5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
    <path d="M15 7v4M13 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export default function BottomNav({ currentView, onNavigate }) {
  const { t } = useTranslation()
  const NAV_ITEMS = [
    { key: 'lobby',   label: t('nav.lobbies'), Icon: LobbyIcon   },
    { key: 'friends', label: t('nav.friends'), Icon: FriendsIcon },
    { key: 'groups',  label: t('nav.groups'),  Icon: GroupsIcon  },
    { key: 'profile', label: t('nav.profile'), Icon: ProfileIcon },
  ]
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: '#1A1A1C',
        borderTop: '0.5px solid #3F3F46',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{ display: 'flex', height: 56 }}>
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = currentView === key
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                background: 'none', border: 'none', cursor: 'pointer',
                position: 'relative',
                // Active 2px Bordeaux top indicator
                borderTop: `2px solid ${active ? '#9B1631' : 'transparent'}`,
                transition: 'border-color 150ms ease-out',
                minHeight: 44,
                padding: '6px 0',
              }}
            >
              <motion.span
                style={{ color: active ? '#FAFAFA' : '#A1A1AA', transition: 'color 150ms ease-out' }}
                animate={active ? { y: 0 } : { y: 0 }}
                whileTap={{ scale: 0.85, transition: { duration: 0.1, ease: EASE } }}
              >
                <Icon active={active} />
              </motion.span>
              <span style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: active ? 500 : 400,
                color: active ? '#FAFAFA' : '#A1A1AA',
                transition: 'color 150ms ease-out',
              }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
