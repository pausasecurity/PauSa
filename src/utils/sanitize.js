// Strips HTML tags and normalizes whitespace to prevent stored-XSS
// and layout-breaking injections in localStorage-persisted strings.
// React's JSX already escapes interpolated strings, but we sanitize
// before writing to localStorage so recovered data stays clean too.

const STRIP_TAGS = /<[^>]*>/g
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g

export function sanitizeText(value, maxLen = 200) {
  if (typeof value !== 'string') return ''
  return value
    .replace(STRIP_TAGS, '')
    .replace(CONTROL_CHARS, '')
    .trim()
    .slice(0, maxLen)
}

export function sanitizeUsername(value) {
  // Alphanumeric + underscore + hyphen only, 3–30 chars
  const cleaned = sanitizeText(value, 30).replace(/[^\w\-]/g, '')
  return cleaned
}

export function sanitizeClanTag(value) {
  // 2–5 uppercase alphanumeric chars
  return sanitizeText(value, 5).replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

export function sanitizeMotto(value) {
  return sanitizeText(value, 100)
}

// Returns null if valid, or an error message string
export function validateUsername(value) {
  const s = sanitizeUsername(value)
  if (s.length < 3)  return 'Username muss mindestens 3 Zeichen haben.'
  if (s.length > 30) return 'Username darf maximal 30 Zeichen haben.'
  return null
}

export function validateClanTag(value) {
  const s = sanitizeClanTag(value)
  if (s.length < 2) return 'Clan-Tag muss 2–5 Zeichen haben.'
  return null
}

export function validateRequired(value, fieldName = 'Dieses Feld') {
  if (!sanitizeText(value)) return `${fieldName} darf nicht leer sein.`
  return null
}
