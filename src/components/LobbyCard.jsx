import React from 'react'
import { motion } from 'framer-motion'
import { timeAgo } from '../utils/timeAgo'
import { useTranslation } from 'react-i18next'

const PLATFORM_LABELS = {
  crossplay: 'Crossplay',
  pc:        'PC',
  psn:       'PS',
  xbox:      'Xbox',
  nintendo:  'Switch',
}

// Strong ease-out-expo — impeccable + emil-design-eng spec
const EASE_OUT = [0.23, 1, 0.32, 1]

function SlotDots({ filled, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
            background: i < filled ? '#9B1631' : '#3F3F46',
            transition: 'background 200ms ease-out',
          }}
        />
      ))}
    </div>
  )
}

// Icon: chat bubble — replaces any emoji
const MicIcon = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}>
    <rect x="5" y="1" width="6" height="9" rx="3" fill="currentColor"/>
    <path d="M3 7v1a5 5 0 0 0 10 0V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const LobbyCard = React.memo(function LobbyCard({ lobby, currentUser, onOpen, onJoin, featured = false, index = 0 }) {
  const { t } = useTranslation()
  const isMember = currentUser && lobby.members.some(m => m.userId === currentUser.userId)
  const full     = lobby.members.length >= lobby.maxSlots

  return (
    <motion.div
      layoutId={`lobby-card-${lobby.lobbyId}`}
      onClick={() => onOpen?.(lobby)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpen?.(lobby)}
      role="button"
      tabIndex={0}
      aria-label={`${lobby.game} – ${lobby.title}`}
      className="relative flex flex-col cursor-pointer overflow-hidden"
      // Enter: stagger via index, ease-out-expo
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1, y: 0,
        transition: {
          delay: Math.min(index * 0.055, 0.3),
          duration: 0.2,
          ease: EASE_OUT,
        },
      }}
      // Exit: scale down, quick
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.13 } }}
      // Active: physical press feedback (emil-design-eng)
      whileTap={{ scale: 0.97, transition: { duration: 0.1, ease: 'easeOut' } }}
      style={{
        background: '#1A1A1C',
        border: `1px solid ${featured ? '#9B163155' : '#3F3F46'}`,
        borderRadius: 10,
        padding: '16px',
        // Hover via CSS transition — GPU-friendly, no JS overhead
        transition: 'border-color 150ms ease-out',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#9B1631' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = featured ? '#9B163155' : '#3F3F46' }}
    >
      {/* Top stripe — 2px, no side stripes (impeccable ban) */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 2,
        background: featured ? '#9B1631' : '#1A2744',
        borderRadius: '10px 10px 0 0',
      }} />

      {/* Game-Tag + Zeit */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }}>
        <span style={{
          background: '#1A274440', color: '#8BA3D4',
          fontSize: 11, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
          padding: '2px 8px', borderRadius: 4,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {lobby.game}
        </span>
        <span style={{ color: '#555555', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}>
          {timeAgo(lobby.createdAt)}
        </span>
      </div>

      {/* Titel */}
      <p style={{
        color: '#FAFAFA', fontSize: 13, fontWeight: 500,
        fontFamily: 'DM Sans, sans-serif', marginBottom: 8, lineHeight: 1.4,
      }}>
        {lobby.title}
      </p>

      {/* Rang-Pill + Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {lobby.minRank && (
          <span style={{
            background: '#1A274440', color: '#8BA3D4',
            fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            padding: '2px 8px', borderRadius: 4,
          }}>
            {lobby.minRank}+
          </span>
        )}
        {lobby.requiresMic && (
          <span style={{
            background: '#1A274440', color: '#8BA3D4',
            fontSize: 11, fontFamily: 'DM Sans, sans-serif',
            padding: '2px 8px', borderRadius: 4,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <MicIcon /> Mic
          </span>
        )}
        <span style={{
          background: '#1A274440', color: '#8BA3D4',
          fontSize: 11, fontFamily: 'DM Sans, sans-serif',
          padding: '2px 8px', borderRadius: 4,
        }}>
          {lobby.language === 'de' ? 'DE' : lobby.language === 'en' ? 'EN' : 'INT'}
        </span>
        {lobby.platform && lobby.platform !== 'crossplay' && (
          <span style={{
            background: '#1A274440', color: '#8BA3D4',
            fontSize: 11, fontFamily: 'DM Sans, sans-serif',
            padding: '2px 8px', borderRadius: 4,
          }}>
            {PLATFORM_LABELS[lobby.platform] ?? lobby.platform}
          </span>
        )}
      </div>

      {/* Bottom: Slot-Dots + Join */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #27272A',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SlotDots filled={lobby.members.length} total={lobby.maxSlots} />
          <span style={{ color: '#71717A', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}>
            {lobby.members.length}/{lobby.maxSlots}
          </span>
        </div>

        {isMember ? (
          <span style={{ color: '#9B1631', fontSize: 11, fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}>
            {t('groups.joined')}
          </span>
        ) : (
          <motion.button
            onClick={e => { e.stopPropagation(); onJoin?.(e, lobby.lobbyId) }}
            disabled={full}
            // Active state: physical press (emil-design-eng)
            whileTap={!full ? { scale: 0.95, transition: { duration: 0.1 } } : {}}
            style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500,
              padding: '4px 12px', borderRadius: 6, minHeight: 44,
              background: full ? 'transparent' : '#9B163118',
              color: full ? '#555555' : '#9B1631',
              border: `1px solid ${full ? '#3F3F46' : '#9B163155'}`,
              cursor: full ? 'not-allowed' : 'pointer',
              transition: 'background 150ms ease-out',
            }}
            onMouseEnter={e => { if (!full) e.currentTarget.style.background = '#9B163133' }}
            onMouseLeave={e => { if (!full) e.currentTarget.style.background = '#9B163118' }}
          >
            {full ? t('lobby.full') : t('lobby.join')}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
})

export default LobbyCard
