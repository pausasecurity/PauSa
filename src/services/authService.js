import { supabase, setSessionOnly, must } from './supabase'

const toUser = (u) => (u ? { uid: u.id, email: u.email } : null)
const redirectTo = () => window.location.origin

// Profil-Daten gehen als user_metadata mit; der DB-Trigger legt daraus Profil + Socials an.
// Mit E-Mail-Bestätigung gibt es danach noch keine Session.
export async function registerWithEmail(email, password, { username, favoriteGames = [], socialLinks = {} } = {}) {
  const data = must(await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo(),
      data: { username, favorite_games: favoriteGames, social_links: socialLinks },
    },
  }))
  // Supabase verschleiert existierende Adressen: User ohne Identities = bereits registriert
  if (data.user && data.user.identities?.length === 0) {
    const err = new Error('E-Mail bereits registriert.')
    err.code = 'user_already_exists'
    throw err
  }
  return { user: toUser(data.user), needsConfirmation: !data.session }
}

export async function resendConfirmation(email) {
  must(await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo() } }))
}

export async function loginWithEmail(email, password, rememberMe = true) {
  setSessionOnly(!rememberMe)
  const data = must(await supabase.auth.signInWithPassword({ email, password }))
  return { user: toUser(data.user) }
}

export async function logoutUser() {
  await supabase.auth.signOut()
}

export async function resetPassword(email) {
  must(await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() }))
}

export async function setNewPassword(password) {
  must(await supabase.auth.updateUser({ password }))
}

const EMAIL_LINK_TYPES = ['signup', 'recovery', 'email_change', 'email']

// Links aus den Auth-Mails zeigen auf /auth/confirm?token_hash=…&type=… (eigene Domain statt supabase.co).
// Erst der Klick in der App löst das Token ein → Link-Scanner der Mailanbieter verbrauchen es nicht.
// Rückgabe: null (kein Mail-Link) | { type, error? }. Recovery löst PASSWORD_RECOVERY in onAuthChange aus.
export async function consumeEmailLink() {
  if (window.location.pathname !== '/auth/confirm') return null
  const params = new URLSearchParams(window.location.search)
  const tokenHash = params.get('token_hash')
  const type      = params.get('type')
  window.history.replaceState(null, '', '/')

  if (!tokenHash || !EMAIL_LINK_TYPES.includes(type)) return { type, error: 'Ungültiger Link.' }
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  if (error) {
    console.error('[Auth] Mail-Link', error)
    const expired = error.code === 'otp_expired' || error.status === 403
    return { type, error: expired ? 'Der Link ist abgelaufen oder wurde schon benutzt.' : authError(error) }
  }
  return { type }
}

// cb(user|null, event) — feuert initial und danach nur bei User-Wechsel oder Passwort-Recovery.
// setTimeout: Supabase-Aufrufe direkt im Auth-Callback können blockieren.
export function onAuthChange(cb) {
  let lastId
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null
    const id = user?.id ?? null
    if (id === lastId && event !== 'PASSWORD_RECOVERY') return
    lastId = id
    setTimeout(() => cb(toUser(user), event), 0)
  })
  return () => data.subscription.unsubscribe()
}

// Gibt null zurück wenn ok, sonst Fehlermeldung
export function validatePassword(pw) {
  if (!pw || pw.length < 8)          return 'Mindestens 8 Zeichen.'
  if (!/[a-z]/.test(pw))             return 'Mindestens ein Kleinbuchstabe.'
  if (!/[A-Z]/.test(pw))             return 'Mindestens ein Großbuchstabe.'
  if (!/[0-9]/.test(pw))             return 'Mindestens eine Zahl.'
  if (!/[^A-Za-z0-9]/.test(pw))      return 'Mindestens ein Sonderzeichen.'
  return null
}

async function reauth(currentPassword) {
  const { data } = await supabase.auth.getUser()
  if (!data?.user) throw new Error('Nicht eingeloggt.')
  must(await supabase.auth.signInWithPassword({ email: data.user.email, password: currentPassword }))
}

// Wirksam erst nach Klick auf die Bestätigungslinks (alte + neue Adresse)
export async function changeEmail(newEmail, currentPassword) {
  await reauth(currentPassword)
  must(await supabase.auth.updateUser({ email: newEmail }, { emailRedirectTo: redirectTo() }))
}

export async function changePassword(newPassword, currentPassword) {
  await reauth(currentPassword)
  must(await supabase.auth.updateUser({ password: newPassword }))
}

export async function deleteAccount(currentPassword) {
  await reauth(currentPassword)
  must(await supabase.rpc('delete_own_account'))
  await supabase.auth.signOut({ scope: 'local' })
}

export function authError(err) {
  console.error('[Auth]', err)
  const map = {
    invalid_credentials:            'E-Mail oder Passwort falsch.',
    email_not_confirmed:            'Bitte bestätige zuerst deine E-Mail-Adresse (Link im Postfach).',
    user_already_exists:            'E-Mail bereits registriert.',
    email_exists:                   'E-Mail bereits registriert.',
    email_address_invalid:          'Ungültige E-Mail-Adresse.',
    validation_failed:              'Ungültige Eingabe.',
    weak_password:                  'Passwort zu schwach (8+ Zeichen, Groß-/Kleinbuchstabe, Zahl, Sonderzeichen).',
    same_password:                  'Das neue Passwort muss sich vom alten unterscheiden.',
    over_request_rate_limit:        'Zu viele Versuche. Bitte warte kurz.',
    over_email_send_rate_limit:     'Zu viele E-Mails angefordert. Bitte warte ein paar Minuten.',
    email_address_not_authorized:   'An diese Adresse können aktuell keine E-Mails verschickt werden.',
    reauthentication_needed:        'Bitte melde dich erneut an.',
    signup_disabled:                'Registrierung aktuell nicht möglich.',
    user_not_found:                 'Kein Konto mit dieser E-Mail.',
  }
  if (err?.code && map[err.code]) return map[err.code]
  if (err?.name === 'AuthRetryableFetchError' || err?.status === 0) return 'Netzwerkfehler. Bitte Verbindung prüfen.'
  return err?.message || 'Anmeldung fehlgeschlagen.'
}
