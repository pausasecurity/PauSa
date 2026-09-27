import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Drawer } from 'vaul'
import { useTranslation } from 'react-i18next'
import { RANK_OPTIONS } from '../services/lobbyService'

// ── Options ───────────────────────────────────────────────────
const PLATFORM_OPTIONS = [
  { value: 'any',    label: 'Alle'       },
  { value: 'pc',     label: '💻 PC'      },
  { value: 'ps5',    label: '🎮 PS5'     },
  { value: 'xbox',   label: '🟢 Xbox'    },
  { value: 'switch', label: '🔴 Switch'  },
  { value: 'mobile', label: '📱 Mobile'  },
]

const REGION_OPTIONS = [
  { value: 'any', label: 'Alle'   },
  { value: 'eu',  label: '🌍 EU'  },
  { value: 'na',  label: '🌎 NA'  },
  { value: 'as',  label: '🌏 AS'  },
  { value: 'sa',  label: '🌎 SA'  },
  { value: 'oc',  label: '🌏 OC'  },
]

const GENDER_OPTIONS = [
  { value: 'any',    label: 'Alle'        },
  { value: 'mixed',  label: '👥 Gemischt' },
  { value: 'male',   label: '♂ Männer'   },
  { value: 'female', label: '♀ Frauen'   },
]

const MODE_OPTIONS = [
  { value: 'any',         label: 'Alle'         },
  { value: 'casual',      label: '😎 Casual'    },
  { value: 'ranked',      label: '🏆 Ranked'    },
  { value: 'competitive', label: '⚔ Kompetitiv' },
  { value: 'fun',         label: '🎉 Fun'        },
]

const AGE_OPTIONS = [
  { value: 'any', label: 'Alle' },
  { value: '16',  label: '16+'  },
  { value: '18',  label: '18+'  },
  { value: '25',  label: '25+'  },
]

const LANG_OPTIONS = [
  { value: 'any', label: '🌐 Egal'     },
  { value: 'de',  label: '🇩🇪 Deutsch' },
  { value: 'en',  label: '🇬🇧 English' },
]

const MIC_OPTIONS = [
  { value: 'any', label: '🎤 Egal'     },
  { value: 'yes', label: '✔ Pflicht'  },
  { value: 'no',  label: '✕ Kein Mic' },
]

const RANK_FILTER_OPTIONS = ['any', ...RANK_OPTIONS.filter(r => r !== 'Keine')]

export const DEFAULT_FILTERS = {
  game:     'Alle',
  platform: 'any',
  region:   'any',
  gender:   'any',
  mode:     'any',
  ageRange: 'any',
  language: 'any',
  mic:      'any',
  rank:     'any',
}

// ── Helpers ───────────────────────────────────────────────────
function chip(active) {
  return {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 12,
    fontWeight: active ? 500 : 400,
    padding: '5px 13px',
    borderRadius: 20,
    border: `1px solid ${active ? '#9B1631' : '#3F3F46'}`,
    background: active ? '#9B163118' : 'transparent',
    color: active ? '#FAFAFA' : '#A1A1AA',
    minHeight: 32,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  }
}

function Chip({ label, active, onClick }) {
  return <button style={chip(active)} onClick={onClick}>{label}</button>
}

function Section({ title, children }) {
  return (
    <div>
      <p style={{ color: '#555', fontSize: 10, fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        {title}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function ActivePill({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: 'DM Sans, sans-serif', fontSize: 11,
      color: '#FAFAFA', background: '#9B163120',
      border: '1px solid #9B163140', borderRadius: 20,
      padding: '3px 8px 3px 10px',
    }}>
      {label}
      <button onClick={onRemove} style={{ color: '#9B1631', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 12 }}>
        ✕
      </button>
    </span>
  )
}

function FilterContent({ filters, onChange, games }) {
  const { t } = useTranslation()
  const set = (key, value) => onChange({ ...filters, [key]: value })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Section title={t('filter.game')}>
        {games.map(g => <Chip key={g} label={g} active={filters.game === g} onClick={() => set('game', g)} />)}
      </Section>
      <Section title={t('filter.platform')}>
        {PLATFORM_OPTIONS.map(o => <Chip key={o.value} label={o.label} active={filters.platform === o.value} onClick={() => set('platform', o.value)} />)}
      </Section>
      <Section title={t('filter.gameMode')}>
        {MODE_OPTIONS.map(o => <Chip key={o.value} label={o.label} active={filters.mode === o.value} onClick={() => set('mode', o.value)} />)}
      </Section>
      <Section title={t('filter.region')}>
        {REGION_OPTIONS.map(o => <Chip key={o.value} label={o.label} active={filters.region === o.value} onClick={() => set('region', o.value)} />)}
      </Section>
      <Section title={t('filter.language')}>
        {LANG_OPTIONS.map(o => <Chip key={o.value} label={o.label} active={filters.language === o.value} onClick={() => set('language', o.value)} />)}
      </Section>
      <Section title={t('filter.gender')}>
        {GENDER_OPTIONS.map(o => <Chip key={o.value} label={o.label} active={filters.gender === o.value} onClick={() => set('gender', o.value)} />)}
      </Section>
      <Section title={t('filter.minAge')}>
        {AGE_OPTIONS.map(o => <Chip key={o.value} label={o.label} active={filters.ageRange === o.value} onClick={() => set('ageRange', o.value)} />)}
      </Section>
      <Section title={t('filter.microphone')}>
        {MIC_OPTIONS.map(o => <Chip key={o.value} label={o.label} active={filters.mic === o.value} onClick={() => set('mic', o.value)} />)}
      </Section>
      <Section title={t('filter.minRank')}>
        {RANK_FILTER_OPTIONS.map(r => <Chip key={r} label={r === 'any' ? 'Alle' : r} active={filters.rank === r} onClick={() => set('rank', r)} />)}
      </Section>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function FilterPanel({ filters, onFiltersChange, lobbies }) {
  const { t } = useTranslation()
  const [open, setOpen]           = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const games = useMemo(() => {
    const unique = [...new Set(lobbies.map(l => l.game))].sort()
    return ['Alle', ...unique]
  }, [lobbies])

  const activeCount = [
    filters.game !== 'Alle',
    filters.platform !== 'any',
    filters.region !== 'any',
    filters.gender !== 'any',
    filters.mode !== 'any',
    filters.ageRange !== 'any',
    filters.language !== 'any',
    filters.mic !== 'any',
    filters.rank !== 'any',
  ].filter(Boolean).length

  const reset = () => onFiltersChange(DEFAULT_FILTERS)

  const triggerStyle = (active) => ({
    fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
    color: active ? '#FAFAFA' : '#A1A1AA',
    background: active ? '#9B163110' : '#1A1A1C',
    border: `1px solid ${active ? '#9B163155' : '#3F3F46'}`,
    borderRadius: 8, padding: '7px 14px',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    cursor: 'pointer', transition: 'all 0.15s',
  })

  const badge = (n) => (
    <span style={{
      background: '#9B1631', color: '#fff', borderRadius: '50%',
      width: 18, height: 18, fontSize: 10, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>{n}</span>
  )

  return (
    <>
      {/* ── DESKTOP ── */}
      <section
        className="hidden md:flex items-center gap-3 px-6 py-3 flex-wrap"
        style={{ borderBottom: '0.5px solid #3F3F46', background: '#0E0E0F' }}
      >
        <div ref={ref} style={{ position: 'relative' }}>
          <button onClick={() => setOpen(v => !v)} style={triggerStyle(open || activeCount > 0)}>
            {/* Funnel icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            {t('filter.title')}
            {activeCount > 0 && badge(activeCount)}
            <svg
              width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {open && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0,
              width: 420, maxHeight: 500, overflowY: 'auto',
              background: '#1A1A1C', border: '0.5px solid #3F3F46',
              borderRadius: 12, padding: 20, zIndex: 80,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              <FilterContent filters={filters} onChange={onFiltersChange} games={games} />
            </div>
          )}
        </div>

        {activeCount > 0 && (
          <button onClick={reset} style={{ color: '#9B1631', fontSize: 12, fontFamily: 'DM Sans, sans-serif', background: 'none', border: 'none', cursor: 'pointer' }}>
            {t('filter.reset')}
          </button>
        )}

        {/* Active pills */}
        {filters.game     !== 'Alle' && <ActivePill label={filters.game} onRemove={() => onFiltersChange({ ...filters, game: 'Alle' })} />}
        {filters.platform !== 'any'  && <ActivePill label={PLATFORM_OPTIONS.find(o => o.value === filters.platform)?.label} onRemove={() => onFiltersChange({ ...filters, platform: 'any' })} />}
        {filters.mode     !== 'any'  && <ActivePill label={MODE_OPTIONS.find(o => o.value === filters.mode)?.label}         onRemove={() => onFiltersChange({ ...filters, mode: 'any' })} />}
        {filters.region   !== 'any'  && <ActivePill label={REGION_OPTIONS.find(o => o.value === filters.region)?.label}     onRemove={() => onFiltersChange({ ...filters, region: 'any' })} />}
        {filters.language !== 'any'  && <ActivePill label={LANG_OPTIONS.find(o => o.value === filters.language)?.label}     onRemove={() => onFiltersChange({ ...filters, language: 'any' })} />}
        {filters.gender   !== 'any'  && <ActivePill label={GENDER_OPTIONS.find(o => o.value === filters.gender)?.label}     onRemove={() => onFiltersChange({ ...filters, gender: 'any' })} />}
        {filters.ageRange !== 'any'  && <ActivePill label={`${filters.ageRange}+`}                                           onRemove={() => onFiltersChange({ ...filters, ageRange: 'any' })} />}
        {filters.mic      !== 'any'  && <ActivePill label={MIC_OPTIONS.find(o => o.value === filters.mic)?.label}           onRemove={() => onFiltersChange({ ...filters, mic: 'any' })} />}
        {filters.rank     !== 'any'  && <ActivePill label={`ab ${filters.rank}`}                                             onRemove={() => onFiltersChange({ ...filters, rank: 'any' })} />}
      </section>

      {/* ── MOBILE ── */}
      <div
        className="md:hidden flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '0.5px solid #3F3F46', background: '#0E0E0F' }}
      >
        <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Drawer.Trigger asChild>
            <button style={{ ...triggerStyle(activeCount > 0), minHeight: 44 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              {t('filter.title')}
              {activeCount > 0 && badge(activeCount)}
            </button>
          </Drawer.Trigger>

          <Drawer.Portal>
            <Drawer.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,15,0.7)', zIndex: 58 }} />
            <Drawer.Content style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 59,
              background: '#1A1A1C', borderTop: '0.5px solid #3F3F46',
              borderRadius: '10px 10px 0 0', padding: '0 16px 32px',
              maxHeight: '88vh', overflowY: 'auto',
            }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#3F3F46', margin: '12px auto 20px' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: '#FAFAFA' }}>{t('filter.title')}</p>
                {activeCount > 0 && (
                  <button onClick={reset} style={{ color: '#9B1631', fontSize: 12, fontFamily: 'DM Sans, sans-serif', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {t('filter.reset')}
                  </button>
                )}
              </div>

              <FilterContent filters={filters} onChange={onFiltersChange} games={games} />

              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  marginTop: 24, width: '100%', background: '#9B1631',
                  color: '#fff', border: 'none', borderRadius: 10, padding: 13,
                  fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                }}
              >
                {activeCount > 0 ? `${activeCount} ${t('filter.apply')}` : t('common.close')}
              </button>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        {activeCount > 0 && (
          <button onClick={reset} style={{ color: '#9B1631', fontSize: 20, lineHeight: 1, minHeight: 44, minWidth: 44, background: 'none', border: 'none', cursor: 'pointer' }}>
            ✕
          </button>
        )}
      </div>
    </>
  )
}
