import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { changeEmail, changePassword, deleteAccount, validatePassword, authError } from '../services/authService'
import { loadProfile, saveProfile } from '../services/profileService'
import { saveUsername, saveSocialLinks } from '../services/userService'
import { sanitizeUsername } from '../utils/sanitize'
import { PLATFORM_META } from '../data/constants'
import DoubleConfirm from './shared/DoubleConfirm'

const ACCOUNT_KEY = 'pausa_account'

function loadAccount() {
  try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY)) ?? { usernameChanges: [], socialVisibility: 'friends' } }
  catch { return { usernameChanges: [], socialVisibility: 'friends' } }
}

function saveAccount(data) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(data))
}

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000

function canChangeUsername(changes = []) {
  if (!changes.length) return true
  return Date.now() - new Date(changes[changes.length - 1]).getTime() >= SIX_MONTHS_MS
}

function nextChangeDate(changes = []) {
  if (!changes.length) return null
  const next = new Date(new Date(changes[changes.length - 1]).getTime() + SIX_MONTHS_MS)
  return next.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Wiederverwendbares Inline-Formular
function InlineForm({ fields, onSubmit, onCancel, submitLabel = 'Speichern', error, loading }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(f => [f.name, ''])))
  const set = (name, value) => setValues(v => ({ ...v, [name]: value }))

  return (
    <div className="space-y-2 mt-2">
      {fields.map(f => (
        <input
          key={f.name}
          type={f.type ?? 'text'}
          placeholder={f.placeholder}
          value={values[f.name]}
          onChange={e => set(f.name, e.target.value)}
          autoComplete={f.autoComplete}
          className="w-full bg-brand-dark border border-gray-700 focus:border-brand-primary rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none"
        />
      ))}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(values)}
          disabled={loading}
          className="flex-1 bg-brand-primary hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
        >
          {loading ? 'Wird gespeichert…' : submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-700 text-gray-400 hover:text-white text-xs font-semibold py-2 rounded-lg transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <div className="bg-brand-card border border-purple-900/40 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <span>{icon}</span>
        <div>
          <p className="text-white font-semibold text-sm">{title}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function Row({ label, hint, children }) {
  return (
    <div className="mb-5 last:mb-0">
      <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-600 mt-1.5">{hint}</p>}
    </div>
  )
}

function DisplayField({ value, actionLabel, onAction, disabled, disabledTitle }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-brand-dark border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 truncate">
        {value}
      </div>
      <button
        onClick={onAction}
        disabled={disabled}
        title={disabled ? disabledTitle : undefined}
        className="border border-gray-700 hover:border-brand-primary text-gray-500 hover:text-white text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      >
        {actionLabel}
      </button>
    </div>
  )
}

export default function KontoTab() {
  const { t } = useTranslation()
  const VISIBILITY_OPTIONS = [
    { value: 'all',     label: t('account.visAll'),     desc: t('account.visAllDesc') },
    { value: 'friends', label: t('account.visFriends'), desc: t('account.visFriendsDesc') },
    { value: 'none',    label: t('account.visNone'),    desc: t('account.visNoneDesc') },
  ]
  const { currentUser, logout, updateUsername } = useAuth()
  const rawProfile = loadProfile()
  const account    = loadAccount()

  // ── Platform IDs ──
  const [platformIds, setPlatformIds] = useState(() => {
    const links = rawProfile?.socialLinks ?? {}
    return Object.fromEntries(
      Object.keys(PLATFORM_META).map(p => {
        const e = links[p]
        return [p, typeof e === 'object' ? (e?.id ?? '') : (e ?? '')]
      })
    )
  })
  const [platformSaved,    setPlatformSaved]    = useState(false)
  const [platformError,    setPlatformError]    = useState(null)
  const [platformConfirm,  setPlatformConfirm]  = useState(false)

  // ── Username ──
  const [showUsernameEdit,  setShowUsernameEdit]  = useState(false)
  const [usernameMsg,       setUsernameMsg]       = useState(null)
  const [pendingUsername,   setPendingUsername]   = useState(null) // wartet auf Doppel-Bestätigung
  const canChange      = canChangeUsername(account.usernameChanges)
  const nextDate       = nextChangeDate(account.usernameChanges)
  const currentUsername = loadProfile()?.username ?? '—'

  // ── E-Mail ──
  const [showEmailEdit, setShowEmailEdit] = useState(false)
  const [emailMsg,      setEmailMsg]      = useState(null)
  const [emailLoading,  setEmailLoading]  = useState(false)

  // ── Passwort ──
  const [showPasswordEdit, setShowPasswordEdit] = useState(false)
  const [passwordMsg,      setPasswordMsg]      = useState(null)
  const [passwordLoading,  setPasswordLoading]  = useState(false)

  // ── Sichtbarkeit ──
  const [visibility, setVisibility] = useState(account.socialVisibility ?? 'friends')
  const [visibilitySaved, setVisibilitySaved] = useState(false)

  // ── Konto löschen ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteMsg,         setDeleteMsg]         = useState(null)
  const [deleteLoading,     setDeleteLoading]     = useState(false)

  // tracks active timeouts for cleanup on unmount
  const timeoutsRef = useRef([])
  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), [])
  const safeTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms)
    timeoutsRef.current.push(id)
    return id
  }

  // ── Handlers ──

  const _doSavePlatforms = async () => {
    setPlatformError(null)
    const profile = loadProfile() ?? { userId: currentUser?.userId, username: currentUser?.username ?? '', favoriteGames: [], socialLinks: {} }
    const newLinks = Object.fromEntries(
      Object.entries(platformIds).map(([k, v]) => [k, { id: v.trim() || null }])
    )
    try {
      await saveSocialLinks(currentUser.userId, newLinks)
    } catch (e) {
      setPlatformError(e.message)
      setPlatformConfirm(false)
      return
    }
    saveProfile({ ...profile, socialLinks: newLinks })
    setPlatformConfirm(false)
    setPlatformSaved(true)
    safeTimeout(() => setPlatformSaved(false), 2000)
  }

  const handleSavePlatforms = () => {
    setPlatformError(null)
    setPlatformConfirm(true)
  }

  // Validiert und speichert pending-Username in State — echter Save erst nach Doppel-Bestätigung
  const handleUsernameRequest = ({ newUsername }) => {
    setUsernameMsg(null)
    const trimmed = (newUsername ?? '').trim()
    if (trimmed.length < 3)  { setUsernameMsg('Mindestens 3 Zeichen.'); return }
    if (trimmed.length > 24) { setUsernameMsg('Maximal 24 Zeichen.'); return }
    if (sanitizeUsername(trimmed) !== trimmed) { setUsernameMsg('Nur Buchstaben, Zahlen, _ und -.'); return }
    if (!canChange)          { setUsernameMsg(`Nächste Änderung möglich ab ${nextDate}.`); return }
    setPendingUsername(trimmed)
  }

  const handleUsernameConfirmed = async () => {
    if (!pendingUsername) return
    const trimmed = pendingUsername
    try {
      await saveUsername(currentUser.userId, trimmed)
    } catch (e) {
      setPendingUsername(null)
      setUsernameMsg(e.message)
      return
    }
    const profile = loadProfile() ?? { userId: currentUser?.userId, favoriteGames: [], socialLinks: {} }
    saveProfile({ ...profile, username: trimmed })
    saveAccount({ ...account, usernameChanges: [...(account.usernameChanges ?? []), new Date().toISOString()] })
    updateUsername(trimmed)
    setPendingUsername(null)
    setShowUsernameEdit(false)
    safeTimeout(() => setUsernameMsg('✓ Gespeichert'), 0)
    safeTimeout(() => setUsernameMsg(null), 2500)
  }

  const handleEmailChange = async ({ newEmail, currentPassword }) => {
    setEmailMsg(null)
    if (!newEmail?.includes('@')) { setEmailMsg('Ungültige E-Mail-Adresse.'); return }
    if (!currentPassword)         { setEmailMsg('Aktuelles Passwort eingeben.'); return }
    setEmailLoading(true)
    try {
      await changeEmail(newEmail.trim(), currentPassword)
      setShowEmailEdit(false)
      setEmailMsg('✓ Bestätigungslinks an alte und neue E-Mail gesendet.')
      safeTimeout(() => setEmailMsg(null), 6000)
    } catch (e) {
      setEmailMsg(authError(e))
    } finally {
      setEmailLoading(false)
    }
  }

  const handlePasswordChange = async ({ currentPassword, newPassword, confirmPassword }) => {
    setPasswordMsg(null)
    if (!currentPassword) { setPasswordMsg('Aktuelles Passwort eingeben.'); return }
    const err = validatePassword(newPassword ?? '')
    if (err) { setPasswordMsg(err); return }
    if (newPassword !== confirmPassword) { setPasswordMsg('Passwörter stimmen nicht überein.'); return }
    setPasswordLoading(true)
    try {
      await changePassword(newPassword, currentPassword)
      setShowPasswordEdit(false)
      setPasswordMsg('✓ Passwort geändert.')
      safeTimeout(() => setPasswordMsg(null), 3000)
    } catch (e) {
      setPasswordMsg(authError(e))
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleVisibilitySave = (val) => {
    setVisibility(val)
    saveAccount({ ...loadAccount(), socialVisibility: val })
    setVisibilitySaved(true)
    safeTimeout(() => setVisibilitySaved(false), 2000)
  }

  const handleDeleteAccount = async ({ currentPassword }) => {
    setDeleteMsg(null)
    if (!currentPassword) { setDeleteMsg('Passwort eingeben.'); return }
    setDeleteLoading(true)
    try {
      await deleteAccount(currentPassword)
      await logout()
    } catch (e) {
      setDeleteMsg(authError(e))
      setDeleteLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-6">{t('account.title')}</p>
      <div className="space-y-5">

        {/* ── Anmeldedaten ── */}
        {currentUser && (
          <SectionCard icon="🔑" title={t('account.credentials')}>
            {/* E-Mail */}
            <Row label={t('account.emailAddress')} hint={emailMsg?.startsWith('✓') ? emailMsg : undefined}>
              {showEmailEdit ? (
                <InlineForm
                  fields={[
                    { name: 'newEmail',        type: 'email',    placeholder: t('account.newEmail'),       autoComplete: 'email' },
                    { name: 'currentPassword', type: 'password', placeholder: t('account.currentPassword'), autoComplete: 'current-password' },
                  ]}
                  onSubmit={handleEmailChange}
                  onCancel={() => { setShowEmailEdit(false); setEmailMsg(null) }}
                  submitLabel={t('account.changeEmail')}
                  error={emailMsg?.startsWith('✓') ? null : emailMsg}
                  loading={emailLoading}
                />
              ) : (
                <DisplayField
                  value={currentUser.email}
                  actionLabel={t('account.change')}
                  onAction={() => setShowEmailEdit(true)}
                />
              )}
            </Row>

            {/* Passwort */}
            <Row label={t('auth.password')} hint={passwordMsg?.startsWith('✓') ? passwordMsg : undefined}>
              {showPasswordEdit ? (
                <InlineForm
                  fields={[
                    { name: 'currentPassword', type: 'password', placeholder: t('account.currentPassword'),   autoComplete: 'current-password' },
                    { name: 'newPassword',      type: 'password', placeholder: t('account.newPassword'),      autoComplete: 'new-password' },
                    { name: 'confirmPassword',  type: 'password', placeholder: t('account.confirmPassword'),  autoComplete: 'new-password' },
                  ]}
                  onSubmit={handlePasswordChange}
                  onCancel={() => { setShowPasswordEdit(false); setPasswordMsg(null) }}
                  submitLabel={t('account.changePassword')}
                  error={passwordMsg?.startsWith('✓') ? null : passwordMsg}
                  loading={passwordLoading}
                />
              ) : (
                <DisplayField
                  value="••••••••"
                  actionLabel={t('account.change')}
                  onAction={() => setShowPasswordEdit(true)}
                />
              )}
            </Row>
          </SectionCard>
        )}

        {/* ── Persönliche Daten ── */}
        <SectionCard icon="👤" title={t('account.personalData')}>
          {/* Username */}
          <Row
            label={t('account.username')}
            hint={canChange ? t('account.usernameHint') : `${t('account.nextChangeFrom')} ${nextDate}.`}
          >
            {showUsernameEdit ? (
              pendingUsername ? (
                <DoubleConfirm
                  text={`Benutzername wirklich auf „${pendingUsername}" ändern?`}
                  text2={nextDate ? `Nächste Änderung frühestens möglich ab ${nextDate}.` : 'Diese Aktion kann nicht rückgängig gemacht werden.'}
                  confirmLabel="Ja, jetzt ändern"
                  onConfirm={handleUsernameConfirmed}
                  onCancel={() => { setPendingUsername(null); setShowUsernameEdit(false); setUsernameMsg(null) }}
                  variant="warning"
                />
              ) : (
                <InlineForm
                  fields={[{ name: 'newUsername', placeholder: currentUsername, autoComplete: 'username' }]}
                  onSubmit={handleUsernameRequest}
                  onCancel={() => { setShowUsernameEdit(false); setUsernameMsg(null) }}
                  submitLabel={t('account.continueBtn')}
                  error={usernameMsg?.startsWith('✓') ? null : usernameMsg}
                />
              )
            ) : (
              <DisplayField
                value={usernameMsg?.startsWith('✓') ? <span className="text-brand-accent">{usernameMsg}</span> : currentUsername}
                actionLabel={t('account.change')}
                onAction={() => setShowUsernameEdit(true)}
                disabled={!canChange}
                disabledTitle={`${t('account.nextChangeFrom')} ${nextDate}`}
              />
            )}
          </Row>

          {/* Platform IDs */}
          <Row label={t('account.gamingPlatforms')}>
            <div className="space-y-2">
              {Object.entries(PLATFORM_META).map(([platform, meta]) => (
                <div key={platform} className={`flex items-center gap-3 border rounded-xl px-4 py-2.5 transition-colors ${meta.color}`}>
                  <span className="text-xs font-semibold w-24 shrink-0">{meta.label}</span>
                  <input
                    value={platformIds[platform] ?? ''}
                    onChange={e => setPlatformIds(prev => ({ ...prev, [platform]: e.target.value }))}
                    placeholder={meta.placeholder}
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none min-w-0"
                  />
                </div>
              ))}
            </div>
            {platformError && <p className="text-xs text-red-400 mt-2">{platformError}</p>}
            {platformConfirm ? (
              <div className="mt-4">
                <DoubleConfirm
                  text={t('account.savePlatformsConfirm1')}
                  text2={t('account.savePlatformsConfirm2')}
                  confirmLabel={t('account.confirmSave')}
                  onConfirm={_doSavePlatforms}
                  onCancel={() => setPlatformConfirm(false)}
                  variant="warning"
                />
              </div>
            ) : (
              <button
                onClick={handleSavePlatforms}
                className="mt-4 w-full bg-brand-primary hover:bg-purple-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                {platformSaved ? t('account.saved') : t('account.savePlatforms')}
              </button>
            )}
          </Row>
        </SectionCard>

        {/* ── Sichtbarkeitseinstellungen ── */}
        <SectionCard icon="👁" title={t('account.visibility')} subtitle={t('account.whoSeesIds')}>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleVisibilitySave(opt.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                  visibility === opt.value
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-gray-800 hover:border-gray-600'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  visibility === opt.value ? 'border-brand-primary' : 'border-gray-600'
                }`}>
                  {visibility === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-brand-primary block" />}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${visibility === opt.value ? 'text-white' : 'text-gray-400'}`}>{opt.label}</p>
                  <p className="text-xs text-gray-600">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
          {visibilitySaved && <p className="text-xs text-brand-accent mt-3">{t('account.saved')}</p>}
        </SectionCard>

        {/* ── Datenschutz / Konto löschen ── */}
        <SectionCard icon="🛡️" title={t('account.privacy')} subtitle={t('account.manageAccount')}>
          {!showDeleteConfirm ? (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full border border-red-900/50 hover:border-red-700/70 text-red-500 hover:text-red-400 text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                {t('account.deleteAccount')}
              </button>
              <p className="text-xs text-gray-700 mt-2 text-center">{t('account.deleteIrreversible')}</p>
            </>
          ) : (
            <div>
              <p className="text-sm text-red-400 font-semibold mb-3">{t('account.deleteConfirm1')}</p>
              <p className="text-xs text-gray-500 mb-4">{t('account.deleteConfirm2')}</p>
              <InlineForm
                fields={[{ name: 'currentPassword', type: 'password', placeholder: t('account.passwordConfirm'), autoComplete: 'current-password' }]}
                onSubmit={handleDeleteAccount}
                onCancel={() => { setShowDeleteConfirm(false); setDeleteMsg(null) }}
                submitLabel={t('account.deleteForever')}
                error={deleteMsg}
                loading={deleteLoading}
              />
            </div>
          )}
        </SectionCard>

      </div>
    </div>
  )
}
