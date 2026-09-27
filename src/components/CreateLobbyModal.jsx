import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { createLobby, RANK_OPTIONS, LANGUAGE_OPTIONS } from '../services/lobbyService'
import { useAuth } from '../context/AuthContext'
import { useVerification } from '../context/VerificationContext'
import { GAMES } from '../data/games'
import { sanitizeText, validateRequired } from '../utils/sanitize'

const PLATFORM_OPTIONS = [
  { value: 'crossplay', label: '🌐 Crossplay' },
  { value: 'pc',        label: '💻 PC / Steam' },
  { value: 'ps5',       label: '🎮 PlayStation' },
  { value: 'xbox',      label: '🟢 Xbox' },
  { value: 'switch',    label: '🔴 Nintendo Switch' },
  { value: 'mobile',    label: '📱 Mobile' },
]

const REGION_OPTIONS = [
  { value: 'eu', label: '🌍 Europa (EU)'      },
  { value: 'na', label: '🌎 Nordamerika (NA)' },
  { value: 'as', label: '🌏 Asien (AS)'       },
  { value: 'sa', label: '🌎 Südamerika (SA)'  },
  { value: 'oc', label: '🌏 Ozeanien (OC)'    },
]

const MODE_OPTIONS = [
  { value: 'casual',      label: '😎 Casual'    },
  { value: 'ranked',      label: '🏆 Ranked'    },
  { value: 'competitive', label: '⚔ Kompetitiv' },
  { value: 'fun',         label: '🎉 Fun'        },
]

const GENDER_OPTIONS = [
  { value: 'any',    label: 'Keine Angabe'   },
  { value: 'mixed',  label: '👥 Gemischt'    },
  { value: 'male',   label: '♂ Nur Männer'  },
  { value: 'female', label: '♀ Nur Frauen'  },
]

const MINAGE_OPTIONS = [
  { value: 0,  label: 'Kein Minimum' },
  { value: 16, label: '16+'          },
  { value: 18, label: '18+'          },
  { value: 25, label: '25+'          },
]

const EASE = [0.23, 1, 0.32, 1]

const inputStyle = (focused) => ({
  width: '100%', boxSizing: 'border-box',
  background: '#0E0E0F',
  border: `1px solid ${focused ? '#9B1631' : '#3F3F46'}`,
  borderRadius: 8, padding: '9px 12px',
  fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#FAFAFA',
  outline: 'none',
  transition: 'border-color 150ms ease-out',
})

const selectStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#0E0E0F',
  border: '1px solid #3F3F46',
  borderRadius: 8, padding: '9px 12px',
  fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#FAFAFA',
  outline: 'none', cursor: 'pointer',
  transition: 'border-color 150ms ease-out',
  appearance: 'none',
}

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

const CheckIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <circle cx="16" cy="16" r="15" stroke="#9B1631" strokeWidth="1.5"/>
    <path d="M10 16.5l4 4 8-8" stroke="#9B1631" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

function FocusInput({ value, onChange, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      value={value}
      onChange={onChange}
      style={inputStyle(focused)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  )
}

function FocusSelect({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={selectStyle}
      onFocus={e => e.target.style.borderColor = '#9B1631'}
      onBlur={e => e.target.style.borderColor = '#3F3F46'}
    >
      {children}
    </select>
  )
}

export default function CreateLobbyModal({ onClose, onCreated }) {
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const { age }         = useVerification()

  const availableGames = age !== null
    ? GAMES.filter(g => g.ageRating <= age)
    : GAMES

  const [form, setForm] = useState({
    game: '', gameCategory: 'other', title: '',
    description: '', maxSlots: 5,
    requiresMic: false, language: 'de', minRank: 'Keine',
    platform: 'crossplay', region: 'eu', mode: 'casual',
    gender: 'any', minAge: 0,
  })
  const [error, setError]   = useState(null)
  const [done, setDone]     = useState(null)
  const [loading, setLoading] = useState(false)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleGameChange = (label) => {
    const game = GAMES.find(g => g.label === label)
    set('game', label)
    if (game) set('gameCategory', game.category)
  }

  const handleSubmit = async () => {
    setError(null)
    const titleErr = validateRequired(form.title, 'Titel')
    if (titleErr) { setError(titleErr); return }
    if (!form.game) { setError('Bitte ein Spiel wählen.'); return }
    if (!currentUser) { setError('Du musst eingeloggt sein.'); return }
    setLoading(true)
    try {
      const lobby = await createLobby(
        { ...form, title: sanitizeText(form.title, 80) },
        currentUser
      )
      setDone(lobby)
      onCreated?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
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
          position: 'fixed', inset: 0, zIndex: 89,
          background: 'rgba(14,14,15,0.8)', backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <motion.div
        key="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Lobby erstellen"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: EASE } }}
        exit={{ opacity: 0, scale: 0.96, y: 4, transition: { duration: 0.14 } }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', inset: 0, zIndex: 90,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 16px', pointerEvents: 'none',
        }}
      >
        <div style={{
          background: '#1A1A1C',
          border: '0.5px solid #3F3F46',
          borderRadius: 10, width: '100%', maxWidth: 480,
          pointerEvents: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          maxHeight: '90vh', overflowY: 'auto',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '0.5px solid #3F3F46',
            position: 'sticky', top: 0, background: '#1A1A1C', zIndex: 1,
          }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500, color: '#FAFAFA', margin: 0 }}>
              {done ? t('lobby.created') : t('lobby.newLobby')}
            </p>
            <button
              onClick={onClose}
              aria-label="Schließen"
              style={{
                color: '#71717A', background: 'none', border: 'none', cursor: 'pointer',
                minHeight: 44, minWidth: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 120ms ease-out',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#FAFAFA'}
              onMouseLeave={e => e.currentTarget.style.color = '#71717A'}
            >
              <CloseIcon />
            </button>
          </div>

          <div style={{ padding: 24 }}>
            {!done ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Spiel */}
                <div>
                  <label style={labelStyle}>{t('lobby.gameLabel')}</label>
                  <FocusSelect value={form.game} onChange={e => handleGameChange(e.target.value)}>
                    <option value="">{t('lobby.gameSelect')}</option>
                    {availableGames.map(g => <option key={g.id} value={g.label}>{g.label}</option>)}
                  </FocusSelect>
                  {age !== null && availableGames.length < GAMES.length && (
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#555', marginTop: 4 }}>
                      {GAMES.length - availableGames.length} Spiele altersbedingt ausgeblendet
                    </p>
                  )}
                </div>

                {/* Titel */}
                <div>
                  <label style={labelStyle}>{t('lobby.titleLabel')}</label>
                  <FocusInput
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder={t('lobby.titlePlaceholder')}
                    maxLength={80}
                  />
                </div>

                {/* Beschreibung */}
                <div>
                  <label style={labelStyle}>{t('lobby.description')}</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder={t('lobby.descPlaceholder')}
                    maxLength={200}
                    style={{ ...inputStyle(false), resize: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#9B1631'}
                    onBlur={e => e.target.style.borderColor = '#3F3F46'}
                  />
                </div>

                {/* Slots + Rang */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t('lobby.maxSlots')}</label>
                    <FocusInput
                      type="number" min={2} max={10}
                      value={form.maxSlots}
                      onChange={e => set('maxSlots', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('lobby.minRankLabel')}</label>
                    <FocusSelect value={form.minRank} onChange={e => set('minRank', e.target.value)}>
                      {RANK_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </FocusSelect>
                  </div>
                </div>

                {/* Plattform */}
                <div>
                  <label style={labelStyle}>{t('lobby.platform')}</label>
                  <FocusSelect value={form.platform} onChange={e => set('platform', e.target.value)}>
                    {PLATFORM_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </FocusSelect>
                </div>

                {/* Spielmodus + Region */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t('lobby.gameMode')}</label>
                    <FocusSelect value={form.mode} onChange={e => set('mode', e.target.value)}>
                      {MODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </FocusSelect>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('lobby.region')}</label>
                    <FocusSelect value={form.region} onChange={e => set('region', e.target.value)}>
                      {REGION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </FocusSelect>
                  </div>
                </div>

                {/* Geschlecht + Mindestalter */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t('lobby.gender')}</label>
                    <FocusSelect value={form.gender} onChange={e => set('gender', e.target.value)}>
                      {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </FocusSelect>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('lobby.minAge')}</label>
                    <FocusSelect value={form.minAge} onChange={e => set('minAge', Number(e.target.value))}>
                      {MINAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </FocusSelect>
                  </div>
                </div>

                {/* Sprache + Mic */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'end' }}>
                  <div>
                    <label style={labelStyle}>{t('lobby.language')}</label>
                    <FocusSelect value={form.language} onChange={e => set('language', e.target.value)}>
                      {LANGUAGE_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </FocusSelect>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingBottom: 2 }}>
                    <input
                      type="checkbox"
                      checked={form.requiresMic}
                      onChange={e => set('requiresMic', e.target.checked)}
                      style={{ accentColor: '#9B1631', width: 15, height: 15 }}
                    />
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#A1A1AA' }}>
                      {t('lobby.micRequiredLabel')}
                    </span>
                  </label>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0, transition: { duration: 0.15, ease: EASE } }}
                      exit={{ opacity: 0 }}
                      role="alert"
                      style={{
                        fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                        color: '#B52240',
                        padding: '8px 12px',
                        background: 'rgba(155,22,49,0.08)',
                        border: '1px solid rgba(155,22,49,0.25)',
                        borderRadius: 6,
                        margin: 0,
                      }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button
                    onClick={onClose}
                    style={{
                      flex: 1, padding: '10px 0',
                      background: 'transparent', color: '#A1A1AA',
                      border: '1px solid #3F3F46', borderRadius: 8,
                      fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                      cursor: 'pointer', minHeight: 44,
                      transition: 'color 150ms ease-out, border-color 150ms ease-out',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#FAFAFA'; e.currentTarget.style.borderColor = '#71717A' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#A1A1AA'; e.currentTarget.style.borderColor = '#3F3F46' }}
                  >
                    {t('common.cancel')}
                  </button>
                  <motion.button
                    onClick={handleSubmit}
                    disabled={!form.game || !form.title.trim() || loading}
                    whileTap={form.game && form.title.trim() ? { scale: 0.97, transition: { duration: 0.1 } } : {}}
                    style={{
                      flex: 1, padding: '10px 0',
                      background: (!form.game || !form.title.trim() || loading) ? '#27272A' : '#9B1631',
                      color: (!form.game || !form.title.trim() || loading) ? '#555555' : '#FAFAFA',
                      border: 'none', borderRadius: 8,
                      fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
                      cursor: (!form.game || !form.title.trim() || loading) ? 'not-allowed' : 'pointer',
                      minHeight: 44,
                      transition: 'background 150ms ease-out, color 150ms ease-out',
                    }}
                    onMouseEnter={e => { if (form.game && form.title.trim() && !loading) e.currentTarget.style.background = '#B52240' }}
                    onMouseLeave={e => { if (form.game && form.title.trim() && !loading) e.currentTarget.style.background = '#9B1631' }}
                  >
                    {loading ? t('lobby.creating') : t('lobby.create')}
                  </motion.button>
                </div>
              </div>
            ) : (
              // Success state — no emoji
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE } }}
                style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
              >
                <CheckIcon />
                <div>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: '#FAFAFA', marginBottom: 4 }}>
                    {done.title}
                  </p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#71717A' }}>
                    {done.game} · {done.maxSlots} Slots · {t('lobby.expires')}
                  </p>
                </div>
                <motion.button
                  onClick={onClose}
                  whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
                  style={{
                    width: '100%', padding: '10px 0',
                    background: '#9B1631', color: '#FAFAFA',
                    border: 'none', borderRadius: 8,
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', minHeight: 44,
                    transition: 'background 150ms ease-out',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#B52240'}
                  onMouseLeave={e => e.currentTarget.style.background = '#9B1631'}
                >
                  {t('common.close')}
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
