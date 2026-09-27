import { auth } from './firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateEmail,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth'

export const registerWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password)

export const loginWithEmail = async (email, password, rememberMe = true) => {
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
  return signInWithEmailAndPassword(auth, email, password)
}

export const logoutUser = () => signOut(auth)

export const resetPassword = (email) => sendPasswordResetEmail(auth, email)

export const onAuthChange = (cb) => onAuthStateChanged(auth, cb)

// Gibt null zurück wenn ok, sonst Fehlermeldung
export function validatePassword(pw) {
  if (!pw || pw.length < 8)          return 'Mindestens 8 Zeichen.'
  if (!/[A-Z]/.test(pw))             return 'Mindestens ein Großbuchstabe.'
  if (!/[0-9]/.test(pw))             return 'Mindestens eine Zahl.'
  if (!/[^A-Za-z0-9]/.test(pw))      return 'Mindestens ein Sonderzeichen.'
  return null
}

async function reauth(currentPassword) {
  const user = auth.currentUser
  if (!user) throw new Error('Nicht eingeloggt.')
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
}

export async function changeEmail(newEmail, currentPassword) {
  await reauth(currentPassword)
  await updateEmail(auth.currentUser, newEmail)
}

export async function changePassword(newPassword, currentPassword) {
  await reauth(currentPassword)
  await updatePassword(auth.currentUser, newPassword)
}

export async function deleteAccount(currentPassword) {
  await reauth(currentPassword)
  await deleteUser(auth.currentUser)
}

export async function deleteCurrentUser() {
  if (auth.currentUser) await deleteUser(auth.currentUser)
}

export function firebaseAuthError(code) {
  console.error('[Auth] Firebase error code:', code)
  const map = {
    'auth/invalid-credential':        'E-Mail oder Passwort falsch.',
    'auth/user-not-found':            'Kein Konto mit dieser E-Mail.',
    'auth/wrong-password':            'Passwort falsch.',
    'auth/email-already-in-use':      'E-Mail bereits registriert.',
    'auth/invalid-email':             'Ungültige E-Mail-Adresse.',
    'auth/weak-password':             'Passwort zu schwach (mind. 6 Zeichen).',
    'auth/too-many-requests':         'Zu viele Versuche. Bitte warte kurz.',
    'auth/operation-not-allowed':     'E-Mail/Passwort-Login nicht aktiviert. Bitte Firebase Console prüfen.',
    'auth/network-request-failed':    'Netzwerkfehler. Bitte Verbindung prüfen.',
    'auth/configuration-not-found':   'Firebase-Konfiguration ungültig.',
    'auth/admin-restricted-operation':'Registrierung aktuell nicht erlaubt.',
    'auth/missing-email':             'E-Mail-Adresse fehlt.',
    'auth/missing-password':          'Passwort fehlt.',
  }
  return map[code] ?? `Anmeldung fehlgeschlagen. (${code ?? 'unbekannt'})`
}
