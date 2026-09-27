import React, { useState } from 'react'
import { useVerification } from '../context/VerificationContext'
import { saveProfile } from '../services/profileService'
import { registerWithEmail, authError, validatePassword } from '../services/authService'
import { usernameAvailable, flattenSocialLinks } from '../services/userService'
import { calculateAge, validateBirthDate } from '../services/verificationService'
import { createGroup, generateInviteLink } from '../services/groupService'
import { GAMES, CATEGORY_ORDER } from '../data/games'
import { sanitizeText, sanitizeUsername, sanitizeClanTag, sanitizeMotto } from '../utils/sanitize'

// ---- Plattform-Brand-Farben (Tailwind-Approximationen) ----
const PLATFORM_STYLES = {
  steam:    { border: 'border-blue-700/60',  bg: 'bg-blue-900/20',   text: 'text-blue-300',  dot: 'bg-blue-400',   label: 'Steam',       placeholder: 'Steam-Username' },
  psn:      { border: 'border-blue-500/60',  bg: 'bg-blue-600/20',   text: 'text-blue-200',  dot: 'bg-blue-300',   label: 'PlayStation', placeholder: 'PSN-ID' },
  xbox:     { border: 'border-green-600/60', bg: 'bg-green-900/20',  text: 'text-green-400', dot: 'bg-green-400',  label: 'Xbox',        placeholder: 'Gamertag' },
  epic:     { border: 'border-gray-500/60',  bg: 'bg-gray-800/30',   text: 'text-gray-300',  dot: 'bg-gray-400',   label: 'Epic Games',  placeholder: 'Anzeigename' },
  nintendo: { border: 'border-red-600/60',   bg: 'bg-red-900/20',    text: 'text-red-400',   dot: 'bg-red-400',    label: 'Nintendo',    placeholder: 'SW-XXXX-XXXX-XXXX' },
}

const MIN_AGE      = 13
const MAX_GAMES    = 10
const TOTAL_STEPS  = 4   // 0 Basis · 1 Social · 2 Spiele · 3 Clan(optional) → Success

const GENDER_OPTIONS = ['Männlich', 'Weiblich', 'Divers', 'Keine Angabe']

const COUNTRIES = [
  { value: '',   label: '— Land wählen (optional) —' },
  // DACH zuerst
  { value: 'DE', label: 'Deutschland' },
  { value: 'AT', label: 'Österreich' },
  { value: 'CH', label: 'Schweiz' },
  { value: '---', label: '──────────────' },
  // Europa alphabetisch
  { value: 'AL', label: 'Albanien' },
  { value: 'AD', label: 'Andorra' },
  { value: 'BE', label: 'Belgien' },
  { value: 'BA', label: 'Bosnien und Herzegowina' },
  { value: 'BG', label: 'Bulgarien' },
  { value: 'DK', label: 'Dänemark' },
  { value: 'EE', label: 'Estland' },
  { value: 'FI', label: 'Finnland' },
  { value: 'FR', label: 'Frankreich' },
  { value: 'GR', label: 'Griechenland' },
  { value: 'IE', label: 'Irland' },
  { value: 'IS', label: 'Island' },
  { value: 'IT', label: 'Italien' },
  { value: 'HR', label: 'Kroatien' },
  { value: 'LV', label: 'Lettland' },
  { value: 'LI', label: 'Liechtenstein' },
  { value: 'LT', label: 'Litauen' },
  { value: 'LU', label: 'Luxemburg' },
  { value: 'MT', label: 'Malta' },
  { value: 'MK', label: 'Nordmazedonien' },
  { value: 'ME', label: 'Montenegro' },
  { value: 'NL', label: 'Niederlande' },
  { value: 'NO', label: 'Norwegen' },
  { value: 'PL', label: 'Polen' },
  { value: 'PT', label: 'Portugal' },
  { value: 'RO', label: 'Rumänien' },
  { value: 'RU', label: 'Russland' },
  { value: 'SE', label: 'Schweden' },
  { value: 'RS', label: 'Serbien' },
  { value: 'SK', label: 'Slowakei' },
  { value: 'SI', label: 'Slowenien' },
  { value: 'ES', label: 'Spanien' },
  { value: 'CZ', label: 'Tschechien' },
  { value: 'TR', label: 'Türkei' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'HU', label: 'Ungarn' },
  { value: 'GB', label: 'Vereinigtes Königreich' },
  { value: 'BY', label: 'Belarus' },
  { value: 'CY', label: 'Zypern' },
  { value: '---2', label: '──────────────' },
  // Nordamerika
  { value: 'US', label: 'USA' },
  { value: 'CA', label: 'Kanada' },
  { value: 'MX', label: 'Mexiko' },
  { value: '---3', label: '──────────────' },
  // Lateinamerika
  { value: 'BR', label: 'Brasilien' },
  { value: 'AR', label: 'Argentinien' },
  { value: 'CL', label: 'Chile' },
  { value: 'CO', label: 'Kolumbien' },
  { value: 'PE', label: 'Peru' },
  { value: '---4', label: '──────────────' },
  // Asien / Pazifik
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'Südkorea' },
  { value: 'CN', label: 'China' },
  { value: 'TW', label: 'Taiwan' },
  { value: 'SG', label: 'Singapur' },
  { value: 'TH', label: 'Thailand' },
  { value: 'PH', label: 'Philippinen' },
  { value: 'ID', label: 'Indonesien' },
  { value: 'IN', label: 'Indien' },
  { value: 'AU', label: 'Australien' },
  { value: 'NZ', label: 'Neuseeland' },
  { value: '---5', label: '──────────────' },
  // Naher Osten / Afrika
  { value: 'SA', label: 'Saudi-Arabien' },
  { value: 'AE', label: 'Vereinigte Arabische Emirate' },
  { value: 'IL', label: 'Israel' },
  { value: 'ZA', label: 'Südafrika' },
  { value: 'EG', label: 'Ägypten' },
  { value: 'OTHER', label: 'Anderes Land' },
]

// ---- Schrittleiste ----
function Stepper({ step, total }) {
  const labels = ['Profil', 'Konten', 'Spiele', 'Clan']
  return (
    <div className="flex items-center gap-0 mb-6">
      {labels.slice(0, total).map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              i < step  ? 'bg-brand-primary border-brand-primary text-white' :
              i === step ? 'bg-brand-dark border-brand-primary text-brand-primary' :
                           'bg-brand-dark border-gray-700 text-gray-600'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 ${i === step ? 'text-white' : 'text-gray-600'}`}>{label}</span>
          </div>
          {i < total - 1 && (
            <div className={`flex-1 h-0.5 mb-4 mx-1 transition-colors ${i < step ? 'bg-brand-primary' : 'bg-gray-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ---- Schritt 0: Basis-Daten ----
function StepBasis({ data, onChange, onNext }) {
  const [errors, setErrors]     = useState({})
  const [checking, setChecking] = useState(false)

  const validate = () => {
    const e = {}
    if (!data.username || data.username.trim().length < 3) e.username = 'Mindestens 3 Zeichen.'
    else if (sanitizeUsername(data.username) !== data.username.trim()) e.username = 'Nur Buchstaben, Zahlen, _ und -.'
    const birthErr = validateBirthDate(data.birthDate)
    if (birthErr) e.birthDate = birthErr
    if (!data.email || !data.email.includes('@')) e.email = 'Gültige E-Mail erforderlich.'
    const pwErr = validatePassword(data.password)
    if (pwErr) e.password = pwErr
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = async () => {
    if (!validate()) return
    setChecking(true)
    try {
      await onNext()
    } catch (err) {
      setErrors(prev => ({ ...prev, [err.field ?? 'email']: err.field ? err.message : authError(err) }))
    } finally {
      setChecking(false)
    }
  }

  const age = data.birthDate ? calculateAge(data.birthDate) : null

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Username *</label>
        <input
          name="nickname"
          autoComplete="nickname"
          value={data.username}
          onChange={e => onChange('username', e.target.value)}
          placeholder="z.B. ShadowWolf_99"
          maxLength={24}
          className={`w-full bg-brand-dark border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors ${
            errors.username ? 'border-red-500' : 'border-gray-700 focus:border-brand-primary'
          }`}
        />
        {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username}</p>}
      </div>

      <div>
        <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Geburtsdatum * (13+ erforderlich)</label>
        <input
          type="date"
          value={data.birthDate}
          onChange={e => onChange('birthDate', e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className={`w-full bg-brand-dark border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors ${
            errors.birthDate ? 'border-red-500' : 'border-gray-700 focus:border-brand-primary'
          }`}
        />
        {errors.birthDate
          ? <p className="text-xs text-red-400 mt-1">{errors.birthDate}</p>
          : age !== null && (
            <p className={`text-xs mt-1 ${age >= 16 ? 'text-brand-accent' : age >= 13 ? 'text-gray-500' : 'text-red-400'}`}>
              {age >= 16 ? `${age} Jahre – 16+ Features verfügbar nach Verifizierung` : `${age} Jahre`}
            </p>
          )
        }
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Geschlecht</label>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => onChange('gender', data.gender === g ? '' : g)}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                  data.gender === g
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : 'border-gray-700 text-gray-400 hover:border-brand-primary hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Land</label>
        <select
          value={data.region}
          onChange={e => !e.target.value.startsWith('---') && onChange('region', e.target.value)}
          className="w-full bg-brand-dark border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors appearance-none cursor-pointer"
        >
          {COUNTRIES.map(r => (
            <option key={r.value} value={r.value} disabled={r.value.startsWith('---')} className="bg-[#1A1A2E]">{r.label}</option>
          ))}
        </select>
      </div>

      <div className="border-t border-purple-900/30 pt-4">
        <p className="text-xs text-gray-600 mb-3">Konto-Daten (für Login)</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">E-Mail *</label>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={data.email}
              onChange={e => onChange('email', e.target.value)}
              placeholder="deine@email.de"
              className={`w-full bg-brand-dark border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors ${
                errors.email ? 'border-red-500' : 'border-gray-700 focus:border-brand-primary'
              }`}
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Passwort *</label>
            <input
              type="password"
              name="new-password"
              autoComplete="new-password"
              value={data.password}
              onChange={e => onChange('password', e.target.value)}
              placeholder="Min. 8 Zeichen, Groß, Zahl, Sonderzeichen"
              className={`w-full bg-brand-dark border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors ${
                errors.password ? 'border-red-500' : 'border-gray-700 focus:border-brand-primary'
              }`}
            />
            {errors.password
              ? <p className="text-xs text-red-400 mt-1">{errors.password}</p>
              : data.password && !validatePassword(data.password) && (
                <p className="text-xs text-brand-accent mt-1">✓ Passwort erfüllt alle Anforderungen</p>
              )
            }
          </div>
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={checking}
        className="w-full bg-brand-primary hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors"
      >
        {checking ? 'E-Mail wird geprüft…' : 'Weiter →'}
      </button>
    </div>
  )
}

// ---- Schritt 1: Social Links ----
function StepSocial({ data, onChange, onNext, onBack }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 mb-4">Verknüpfe deine Gaming-Konten. Alle Felder sind optional.</p>
      {Object.entries(PLATFORM_STYLES).map(([key, style]) => (
        <div key={key} className={`flex items-center gap-3 border rounded-xl px-4 py-2.5 transition-colors ${style.border} ${style.bg}`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
          <span className={`text-xs font-semibold w-24 shrink-0 ${style.text}`}>{style.label}</span>
          <input
            value={data.socialLinks[key] ?? ''}
            onChange={e => onChange('socialLinks', { ...data.socialLinks, [key]: e.target.value })}
            placeholder={style.placeholder}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
          />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <button onClick={onBack}  className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white py-2.5 rounded-xl text-sm transition-colors">← Zurück</button>
        <button onClick={onNext} className="flex-1 bg-brand-primary hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl transition-colors">Weiter →</button>
      </div>
    </div>
  )
}

// ---- Schritt 2: Lieblingsspiele ----
function StepGames({ data, onChange, onNext, onBack, finishing, finishError }) {
  const selected = data.favoriteGames

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange('favoriteGames', selected.filter(g => g !== id))
    } else if (selected.length < MAX_GAMES) {
      onChange('favoriteGames', [...selected, id])
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Wähle bis zu {MAX_GAMES} Lieblingsspiele. ({selected.length}/{MAX_GAMES} gewählt)
      </p>

      <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
        {CATEGORY_ORDER.map(({ key, label }) => {
          const games = GAMES.filter(g => g.category === key)
          return (
            <div key={key}>
              <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">{label}</p>
              <div className="flex flex-wrap gap-2">
                {games.map(game => {
                  const active = selected.includes(game.id)
                  const disabled = !active && selected.length >= MAX_GAMES
                  return (
                    <button
                      key={game.id}
                      onClick={() => toggle(game.id)}
                      disabled={disabled}
                      className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                        active   ? 'bg-brand-primary border-brand-primary text-white' :
                        disabled ? 'border-gray-800 text-gray-700 cursor-not-allowed' :
                                   'border-gray-700 text-gray-400 hover:border-brand-primary hover:text-white'
                      }`}
                    >
                      {game.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Clan-Gründungs-Checkbox */}
      <label className="flex items-start gap-3 bg-yellow-900/15 border border-yellow-700/30 rounded-xl p-3 cursor-pointer">
        <input
          type="checkbox"
          checked={data.wantsClan}
          onChange={e => onChange('wantsClan', e.target.checked)}
          className="mt-0.5 accent-yellow-500"
        />
        <div>
          <p className="text-sm font-semibold text-yellow-400">Direkt einen Clan gründen</p>
          <p className="text-xs text-gray-500 mt-0.5">Clan-Name, Tag und Motto im nächsten Schritt – du erhältst sofort einen Einladungslink.</p>
        </div>
      </label>

      {finishError && !data.wantsClan && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{finishError}</p>
      )}
      <div className="flex gap-2">
        <button onClick={onBack} disabled={finishing} className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">← Zurück</button>
        <button onClick={onNext} disabled={finishing} className="flex-1 bg-brand-primary hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
          {finishing && !data.wantsClan ? 'Erstelle Konto…' : data.wantsClan ? 'Weiter → Clan' : 'Abschließen'}
        </button>
      </div>
    </div>
  )
}

// ---- Schritt 3: Clan-Gründung ----
function StepClan({ data, onChange, onFinish, onBack, finishing, finishError }) {
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!data.clanName?.trim()) e.clanName = 'Clan-Name erforderlich.'
    if (!data.clanTag || data.clanTag.length < 2) e.clanTag = 'Tag: 2–4 Zeichen.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 mb-2">
        Dein Clan wird direkt nach dem Onboarding erstellt. Du erhältst einen Einladungslink.
      </p>

      <div>
        <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Clan-Name *</label>
        <input
          value={data.clanName ?? ''}
          onChange={e => onChange('clanName', e.target.value)}
          placeholder="z.B. Phantom Wolves"
          className={`w-full bg-brand-dark border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors ${errors.clanName ? 'border-red-500' : 'border-gray-700 focus:border-yellow-500'}`}
        />
        {errors.clanName && <p className="text-xs text-red-400 mt-1">{errors.clanName}</p>}
      </div>

      <div className="flex gap-3">
        <div className="w-28">
          <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Clan-Tag *</label>
          <input
            value={data.clanTag ?? ''}
            onChange={e => onChange('clanTag', e.target.value.toUpperCase().slice(0, 4))}
            placeholder="TAG"
            className={`w-full bg-brand-dark border rounded-lg px-3 py-2.5 text-sm font-mono text-yellow-400 text-center focus:outline-none transition-colors ${errors.clanTag ? 'border-red-500' : 'border-gray-700 focus:border-yellow-500'}`}
          />
          {errors.clanTag && <p className="text-xs text-red-400 mt-1">{errors.clanTag}</p>}
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Motto</label>
          <input
            value={data.clanMotto ?? ''}
            onChange={e => onChange('clanMotto', e.target.value)}
            placeholder="Dominate. Adapt. Win."
            className="w-full bg-brand-dark border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
          />
        </div>
      </div>

      {finishError && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{finishError}</p>
      )}
      <div className="flex gap-2 pt-2">
        <button onClick={onBack} disabled={finishing} className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">← Zurück</button>
        <button
          onClick={() => validate() && onFinish()}
          disabled={finishing}
          className="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors"
        >
          {finishing ? 'Erstelle Konto…' : '⚔ Clan gründen'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// HAUPT-KOMPONENTE
// ============================================================
export default function OnboardingModal({ onComplete }) {
  const { submitBirthDate }    = useVerification()

  const [step, setStep]             = useState(0)
  const [finishError, setFinishError] = useState(null)
  const [finishing, setFinishing]   = useState(false)

  const [form, setForm] = useState({
    username:      '',
    birthDate:     '',
    gender:        '',
    region:        '',
    email:         '',
    password:      '',
    socialLinks:   { steam: '', psn: '', xbox: '', epic: '', nintendo: '' },
    favoriteGames: [],
    wantsClan:     false,
    clanName:      '',
    clanTag:       '',
    clanMotto:     '',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const totalSteps = form.wantsClan ? 4 : 3

  const finish = async () => {
    setFinishError(null)
    setFinishing(true)
    try {
      // 1. Konto anlegen — Profil, Spiele und Socials legt der DB-Trigger aus den Metadaten an.
      //    Login erst nach Klick auf den Bestätigungslink.
      const cleanSocialLinks = Object.fromEntries(
        Object.entries(form.socialLinks).map(([k, v]) => [k, { id: v.trim() || null }])
      )
      const username = sanitizeUsername(form.username)
      const { user } = await registerWithEmail(form.email.trim(), form.password, {
        username,
        favoriteGames: form.favoriteGames,
        socialLinks:   flattenSocialLinks(cleanSocialLinks),
      })
      const userId = user.uid

      // 2. Lokale Profil-Daten (Geburtsdatum, Geschlecht, Region bleiben nur lokal)
      const profile = {
        userId,
        username,
        favoriteGames: form.favoriteGames,
        socialLinks:   cleanSocialLinks,
        birthDate:     form.birthDate,
        gender:        form.gender  || null,
        region:        form.region  || null,
      }
      saveProfile(profile)

      // 3. Geburtsdatum sperren
      submitBirthDate(form.birthDate)

      // 4. Clan erstellen (optional)
      let link = null
      if (form.wantsClan && form.clanName && form.clanTag) {
        try {
          const age      = calculateAge(form.birthDate)
          const newGroup = createGroup(
            { type: 'clan', name: sanitizeText(form.clanName, 60), clanTag: sanitizeClanTag(form.clanTag), motto: sanitizeMotto(form.clanMotto), gameType: form.favoriteGames[0] ?? 'Sonstige', category: 'other', requires16: false },
            { userId, username: profile.username, isVerified: age >= 16 }
          )
          link = generateInviteLink(newGroup.groupId)
        } catch { /* Clan-Erstellung optional */ }
      }

      // Pop-up zur E-Mail-Bestätigung zeigt die App (EmailConfirmModal)
      onComplete?.({ email: form.email.trim(), inviteLink: link })
    } catch (err) {
      setFinishError(authError(err))
    } finally {
      setFinishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-[#1A1A2E] border border-purple-800/50 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-purple-900/30 relative">
              <p className="text-xs text-brand-accent uppercase tracking-widest font-semibold mb-1">Willkommen bei PauSa</p>
              <p className="text-lg font-bold text-white">Erstelle dein Profil</p>
              <div className="mt-4">
                <Stepper step={step} total={totalSteps} />
              </div>
          <button
            onClick={() => onComplete?.()}
            aria-label="Schließen"
            style={{
              position: 'absolute', top: 8, right: 12,
              color: '#71717A', background: 'none', border: 'none',
              cursor: 'pointer', minHeight: 44, minWidth: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 120ms ease-out',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#FAFAFA'}
            onMouseLeave={e => e.currentTarget.style.color = '#71717A'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {step === 0 && (
            <StepBasis
              data={form}
              onChange={set}
              onNext={async () => {
                if (!(await usernameAvailable(form.username))) {
                  throw Object.assign(new Error('Username ist bereits vergeben.'), { field: 'username' })
                }
                setStep(1)
              }}
            />
          )}
          {step === 1 && (
            <StepSocial
              data={form}
              onChange={set}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <StepGames
              data={form} onChange={set}
              onNext={() => form.wantsClan ? setStep(3) : finish()}
              onBack={() => setStep(1)}
              finishing={finishing}
              finishError={finishError}
            />
          )}
          {step === 3 && (
            <StepClan
              data={form} onChange={set}
              onFinish={finish}
              onBack={() => setStep(2)}
              finishing={finishing}
              finishError={finishError}
            />
          )}
        </div>

      </div>
    </div>
  )
}
