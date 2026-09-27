// Profile-Daten in localStorage.
// Shape: { userId, username, favoriteGames[], socialLinks{}, savedAt }
// Geburtsdatum liegt in verificationService (pausa_birth_date_locked), nicht hier.
// Session/Auth wird von Supabase Auth (authService.js) übernommen.

const PROFILE_KEY = 'pausa_profile'

export function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() }))
}

export function loadProfile() {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try   { return JSON.parse(raw) }
  catch { return null }
}

export function hasProfile() {
  return localStorage.getItem(PROFILE_KEY) !== null
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY)
}
