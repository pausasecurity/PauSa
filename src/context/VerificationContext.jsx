import React, { createContext, useContext, useState } from 'react'
import {
  getVerificationStatus,
  setBirthDateLocked,
  getLockedBirthDate,
  isBirthDateLocked,
} from '../services/verificationService'

const VerificationContext = createContext(null)
const VERIFIED_KEY = 'pausa_verified'

export function VerificationProvider({ children }) {
  const [birthDate, setBirthDateState] = useState(
    getLockedBirthDate() ?? null
  )
  const [isVerified, setIsVerifiedState] = useState(
    () => localStorage.getItem(VERIFIED_KEY) === 'true'
  )

  const setIsVerified = (val) => {
    if (val) localStorage.setItem(VERIFIED_KEY, 'true')
    else localStorage.removeItem(VERIFIED_KEY)
    setIsVerifiedState(val)
  }

  const status = getVerificationStatus(birthDate, isVerified)

  // Einmalige Eingabe: schlägt lautlos fehl wenn Datum bereits gesperrt ist.
  const submitBirthDate = (dateString) => {
    const accepted = setBirthDateLocked(dateString)
    if (accepted) setBirthDateState(dateString)
    return accepted
  }

  return (
    <VerificationContext.Provider value={{
      birthDate,
      isVerified,
      setIsVerified,
      submitBirthDate,
      birthDateLocked: isBirthDateLocked(),
      ...status,
    }}>
      {children}
    </VerificationContext.Provider>
  )
}

export function useVerification() {
  const ctx = useContext(VerificationContext)
  if (!ctx) throw new Error('useVerification muss innerhalb von <VerificationProvider> verwendet werden')
  return ctx
}
