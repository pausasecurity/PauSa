// ============================================================
// VERIFICATION SERVICE
// Quelle der Wahrheit für Altersberechnung und Verifikations-Status.
// Kein UI-State, keine Side-Effects – reine Berechnungslogik.
// ============================================================

const BIRTH_DATE_KEY = 'pausa_birth_date_locked'

// Präzise Altersberechnung: berücksichtigt, ob Geburtstag in diesem Jahr bereits war.
export function calculateAge(birthDate) {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// Setzt das Geburtsdatum einmalig und sperrt es dauerhaft (localStorage-Lock).
// Gibt true zurück wenn erfolgreich gesetzt, false wenn bereits gesperrt.
export function setBirthDateLocked(dateString) {
  if (localStorage.getItem(BIRTH_DATE_KEY) !== null) return false
  localStorage.setItem(BIRTH_DATE_KEY, dateString)
  return true
}

export function getLockedBirthDate() {
  return localStorage.getItem(BIRTH_DATE_KEY)
}

export function isBirthDateLocked() {
  return localStorage.getItem(BIRTH_DATE_KEY) !== null
}

// Validiert ein Geburtsdatum auf Plausibilität und DSGVO-Mindestalter.
// Gibt einen Fehlerstring zurück oder null bei Erfolg.
export function validateBirthDate(dateString) {
  if (!dateString) return 'Geburtsdatum erforderlich.'

  const [yearStr, monthStr, dayStr] = dateString.split('-')
  const year  = parseInt(yearStr,  10)
  const month = parseInt(monthStr, 10)
  const day   = parseInt(dayStr,   10)

  if (isNaN(year) || isNaN(month) || isNaN(day)) return 'Ungültiges Datumsformat.'

  // Datum mit lokalem Konstruktor prüfen – erkennt Überlauf (z.B. 29. Feb in Nicht-Schaltjahr)
  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year  ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate()      !== day
  ) {
    return month === 2 && day === 29
      ? 'Der 29. Februar existiert nur in Schaltjahren.'
      : 'Dieses Datum existiert nicht.'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  parsed.setHours(0, 0, 0, 0)
  if (parsed > today) return 'Geburtsdatum darf nicht in der Zukunft liegen.'

  const age = calculateAge(dateString)
  if (age > 120) return 'Bitte ein realistisches Geburtsdatum eingeben.'
  if (age < 13)  return 'Du musst mindestens 13 Jahre alt sein (DSGVO).'

  return null
}

// Hauptlogik: leitet aus Alter + Verifikations-Flag den App-Status ab.
// Rückgabe-Shape: { age, unlocked, verificationRequired }
export function getVerificationStatus(birthDate, isVerified) {
  if (!birthDate) {
    return { age: null, unlocked: false, verificationRequired: false }
  }

  const age = calculateAge(birthDate)

  if (age < 16) {
    return { age, unlocked: false, verificationRequired: false }
  }

  if (isVerified) {
    // Bedingung erfüllt: Alter >= 16 UND verifiziert
    return { age, unlocked: true, verificationRequired: false }
  }

  // Alter >= 16 aber noch NICHT verifiziert → Banner anzeigen
  return { age, unlocked: false, verificationRequired: true }
}
