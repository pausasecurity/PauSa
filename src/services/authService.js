import { pb, setSessionOnly } from './pocketbase'

const users  = () => pb.collection('users')
const toUser = (r) => (r ? { uid: r.id, email: r.email } : null)

export async function registerWithEmail(email, password) {
  await users().create({ email, password, passwordConfirm: password })
  const { record } = await users().authWithPassword(email, password)
  return { user: toUser(record) }
}

export async function loginWithEmail(email, password, rememberMe = true) {
  setSessionOnly(!rememberMe)
  const { record } = await users().authWithPassword(email, password)
  return { user: toUser(record) }
}

export const logoutUser = async () => pb.authStore.clear()

export const resetPassword = (email) => users().requestPasswordReset(email)

// cb(user|null) — feuert sofort und danach nur bei Wechsel des eingeloggten Users
export function onAuthChange(cb) {
  if (pb.authStore.isValid) users().authRefresh().catch(() => pb.authStore.clear())
  let lastId
  return pb.authStore.onChange((_, record) => {
    const id = record?.id ?? null
    if (id === lastId) return
    lastId = id
    cb(toUser(record))
  }, true)
}

// Gibt null zurück wenn ok, sonst Fehlermeldung
export function validatePassword(pw) {
  if (!pw || pw.length < 8)          return 'Mindestens 8 Zeichen.'
  if (!/[A-Z]/.test(pw))             return 'Mindestens ein Großbuchstabe.'
  if (!/[0-9]/.test(pw))             return 'Mindestens eine Zahl.'
  if (!/[^A-Za-z0-9]/.test(pw))      return 'Mindestens ein Sonderzeichen.'
  return null
}

async function reauth(currentPassword) {
  const rec = pb.authStore.record
  if (!rec) throw new Error('Nicht eingeloggt.')
  await users().authWithPassword(rec.email, currentPassword)
  return rec
}

// PocketBase ändert die E-Mail erst nach Klick auf den Bestätigungslink
export async function changeEmail(newEmail, currentPassword) {
  await reauth(currentPassword)
  await users().requestEmailChange(newEmail)
}

export async function changePassword(newPassword, currentPassword) {
  const rec = await reauth(currentPassword)
  await users().update(rec.id, { oldPassword: currentPassword, password: newPassword, passwordConfirm: newPassword })
  await users().authWithPassword(rec.email, newPassword)
}

export async function deleteAccount(currentPassword) {
  const rec = await reauth(currentPassword)
  await users().delete(rec.id)
  pb.authStore.clear()
}

export async function deleteCurrentUser() {
  const rec = pb.authStore.record
  if (!rec) return
  await users().delete(rec.id)
  pb.authStore.clear()
}

export function authError(err) {
  console.error('[Auth]', err)
  if (!err)                                  return 'Anmeldung fehlgeschlagen.'
  if (err.isAbort || err.status === 0)       return 'Netzwerkfehler. Bitte Verbindung prüfen.'
  if (err.status === 429)                    return 'Zu viele Versuche. Bitte warte kurz.'

  const fields = err.response?.data ?? {}
  const mail   = fields.email ?? fields.newEmail
  if (mail)                                  return /unique|taken|exists/i.test(`${mail.code} ${mail.message}`)
                                                      ? 'E-Mail bereits registriert.'
                                                      : 'Ungültige E-Mail-Adresse.'
  if (fields.oldPassword)                    return 'Passwort falsch.'
  if (fields.password)                       return 'Passwort zu schwach (mind. 8 Zeichen).'
  if (fields.identity || (err.status === 400 && /authenticate/i.test(err.message ?? '')))
                                             return 'E-Mail oder Passwort falsch.'
  if (err.status === 403)                    return 'Aktion nicht erlaubt.'
  if (err.status === 404)                    return 'Konto nicht gefunden.'
  return err.message || 'Anmeldung fehlgeschlagen.'
}
