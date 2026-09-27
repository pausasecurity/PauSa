import React, { useState } from 'react'
import { createGroup, GAME_CATEGORIES } from '../services/groupService'
import { useVerification } from '../context/VerificationContext'
import { useAuth } from '../context/AuthContext'
import { sanitizeText, sanitizeClanTag, sanitizeMotto, validateClanTag, validateRequired } from '../utils/sanitize'

const STEPS = ['Typ wählen', 'Details', 'Bestätigen']

const GAMES = ['Valorant', 'CS2', 'Apex Legends', 'League of Legends', 'Overwatch 2', 'D&D 5e', 'Pathfinder 2e', 'Shadowrun', 'Sonstige']

export default function CreateGroupModal({ onClose, onCreated }) {
  const { unlocked }    = useVerification()
  const { currentUser } = useAuth()
  const [step, setStep]         = useState(0)
  const [type, setType]         = useState(null)       // 'group' | 'clan'
  const [form, setForm]         = useState({
    name: '', gameType: '', category: 'other',
    maxMembers: 6, description: '', nextSession: '',
    isPrivate: false, requires16: false,
    clanTag: '', motto: '',
  })
  const [error, setError]       = useState(null)
  const [created, setCreated]   = useState(null)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleCreate = () => {
    setError(null)
    const nameErr = validateRequired(form.name, 'Name')
    if (nameErr) { setError(nameErr); return }
    if (type === 'clan') {
      const tagErr = validateClanTag(form.clanTag)
      if (tagErr) { setError(tagErr); return }
    }
    try {
      const sanitized = {
        ...form,
        name:        sanitizeText(form.name, 60),
        description: sanitizeText(form.description, 300),
        clanTag:     sanitizeClanTag(form.clanTag),
        motto:       sanitizeMotto(form.motto),
        gameType:    sanitizeText(form.gameType, 50),
      }
      if (!currentUser) { setError('Bitte zuerst einloggen.'); return }
      const result = createGroup({ ...sanitized, type }, { ...currentUser, isVerified: unlocked })
      setCreated(result)
      setStep(2)
      onCreated?.()
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#1A1A2E] border border-purple-800/50 rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900/40">
          <div>
            <p className="font-bold text-white">{step === 2 ? '🎉 Erstellt!' : 'Neue Einheit gründen'}</p>
            {step < 2 && (
              <div className="flex gap-1 mt-1">
                {STEPS.map((s, i) => (
                  <span key={s} className={`h-1 w-8 rounded-full transition-colors ${i <= step ? 'bg-brand-primary' : 'bg-gray-700'}`} />
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl transition-colors">✕</button>
        </div>

        <div className="p-6">

          {/* SCHRITT 0: Typ wählen */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">Was möchtest du gründen?</p>
              {[
                {
                  key: 'group',
                  title: 'Einfache Gruppe',
                  sub: 'Für P&P-Runden, LFG-Teams oder temporäre Squads. Kein Clan-Tag nötig.',
                  icon: '👥',
                  border: 'border-purple-700/50 hover:border-brand-primary',
                },
                {
                  key: 'clan',
                  title: 'Clan gründen',
                  sub: 'Festes Team mit eigenem Tag, Motto und Officer-Hierarchie.',
                  icon: '⚔️',
                  border: 'border-yellow-700/50 hover:border-yellow-500',
                },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setType(opt.key); setStep(1) }}
                  className={`w-full text-left border rounded-xl p-4 transition-colors ${opt.border} ${type === opt.key ? 'bg-brand-dark' : ''}`}
                >
                  <p className="font-bold text-white">{opt.icon} {opt.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{opt.sub}</p>
                </button>
              ))}
            </div>
          )}

          {/* SCHRITT 1: Details */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">
                    {type === 'clan' ? 'Clan-Name' : 'Gruppenname'} *
                  </label>
                  <input
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder={type === 'clan' ? 'z.B. NightHawk Esports' : 'z.B. Die Vergessenen Lande'}
                    className="w-full bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>

                {type === 'clan' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Clan-Tag * (2–4 Zeichen)</label>
                      <input
                        value={form.clanTag}
                        onChange={e => set('clanTag', e.target.value.toUpperCase().slice(0, 4))}
                        placeholder="NHE"
                        className="w-full bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Motto</label>
                      <input
                        value={form.motto}
                        onChange={e => set('motto', e.target.value)}
                        placeholder="Dominate. Adapt. Win."
                        className="w-full bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Spiel *</label>
                  <select
                    value={form.gameType}
                    onChange={e => set('gameType', e.target.value)}
                    className="w-full bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
                  >
                    <option value="">Wählen…</option>
                    {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Kategorie</label>
                  <select
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className="w-full bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
                  >
                    {Object.entries(GAME_CATEGORIES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Max. Mitglieder</label>
                  <input
                    type="number" min={2} max={50}
                    value={form.maxMembers}
                    onChange={e => set('maxMembers', Number(e.target.value))}
                    className="w-full bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Nächste Session</label>
                  <input
                    type="datetime-local"
                    value={form.nextSession}
                    onChange={e => set('nextSession', e.target.value)}
                    className="w-full bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Beschreibung</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder={type === 'clan' ? 'Steckbrief des Clans…' : 'Worum geht es in dieser Gruppe?'}
                    className="w-full bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="col-span-2 flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={form.isPrivate} onChange={e => set('isPrivate', e.target.checked)} className="accent-brand-primary" />
                    Nur per Einladung
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={form.requires16} onChange={e => set('requires16', e.target.checked)} className="accent-yellow-500" />
                    Nur für 16+ (Altersverifizierung)
                  </label>
                </div>
              </div>

              {error && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep(0)} className="flex-1 border border-gray-700 text-gray-400 hover:text-white py-2 rounded-lg text-sm transition-colors">
                  Zurück
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!form.name || !form.gameType}
                  className={`flex-1 font-bold py-2 rounded-lg text-sm transition-colors disabled:bg-gray-800 disabled:text-gray-600 ${
                    type === 'clan'
                      ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                      : 'bg-brand-primary hover:bg-purple-500 text-white'
                  }`}
                >
                  {type === 'clan' ? '⚔ Clan gründen' : '👥 Gruppe erstellen'}
                </button>
              </div>
            </div>
          )}

          {/* SCHRITT 2: Erfolg */}
          {step === 2 && created && (
            <div className="text-center py-4 space-y-3">
              <p className="text-4xl">{created.type === 'clan' ? '⚔️' : '👥'}</p>
              <p className="text-xl font-bold text-white">{created.name}</p>
              {created.type === 'clan' && (
                <p className="text-yellow-400 font-mono font-bold">[{created.clanTag}]</p>
              )}
              <p className="text-sm text-gray-400">
                {created.type === 'clan' ? 'Clan' : 'Gruppe'} erfolgreich gegründet!
              </p>
              <button onClick={onClose} className="w-full bg-brand-primary hover:bg-purple-500 text-white font-bold py-2 rounded-lg transition-colors">
                Schließen
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
