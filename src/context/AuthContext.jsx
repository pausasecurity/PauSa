import React, { createContext, useContext, useState, useEffect } from 'react'
import { loginWithEmail, logoutUser, onAuthChange, consumeEmailLink } from '../services/authService'
import { loadProfile, saveProfile } from '../services/profileService'
import { getUserDoc } from '../services/userService'
import PasswordResetModal from '../components/PasswordResetModal'
import EmailLinkNotice from '../components/EmailLinkNotice'

const AuthContext = createContext(null)

// DB ist Quelle für Username/Spiele/Socials; localStorage-Profil wird bei Bedarf befüllt
// (z.B. nach E-Mail-Bestätigung auf einem anderen Gerät)
async function resolveUser(authUser) {
  const local = loadProfile()
  let doc = null
  try { doc = await getUserDoc(authUser.uid) } catch (err) { console.error('[Auth] Profil laden', err) }

  const username = doc?.username ?? local?.username ?? authUser.email.split('@')[0]

  if (doc && local?.userId !== authUser.uid) {
    saveProfile({
      userId:        authUser.uid,
      username,
      favoriteGames: doc.favoriteGames ?? [],
      socialLinks:   Object.fromEntries(Object.entries(doc.socialLinks ?? {}).map(([k, v]) => [k, { id: v }])),
    })
  }
  return { userId: authUser.uid, username, email: authUser.email }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoggedIn,  setIsLoggedIn]  = useState(false)
  const [authReady,   setAuthReady]   = useState(false)
  const [recovery,    setRecovery]    = useState(false)

  const [linkNotice,  setLinkNotice]  = useState(null) // Ergebnis eines Mail-Links (/auth/confirm)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser, event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (authUser) {
        setCurrentUser(await resolveUser(authUser))
        setIsLoggedIn(true)
      } else {
        setCurrentUser(null)
        setIsLoggedIn(false)
      }
      setAuthReady(true)
    })
    // Nach dem Abo einlösen, damit PASSWORD_RECOVERY/SIGNED_IN aus verifyOtp ankommen
    consumeEmailLink().then(res => { if (res) setLinkNotice(res) })
    return unsubscribe
  }, [])

  const login = async (email, password, rememberMe = true) => {
    const { user } = await loginWithEmail(email, password, rememberMe)
    const userData = await resolveUser(user)
    setCurrentUser(userData)
    setIsLoggedIn(true)
    return userData
  }

  const updateUsername = (newUsername) => {
    setCurrentUser(prev => prev ? { ...prev, username: newUsername } : prev)
  }

  const logout = async () => {
    await logoutUser()
    setCurrentUser(null)
    setIsLoggedIn(false)
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center">
        <p className="text-gray-600 text-sm">Verbinde…</p>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, currentUser, login, logout, updateUsername }}>
      {children}
      {recovery && <PasswordResetModal onDone={() => setRecovery(false)} />}
      {linkNotice && !recovery && <EmailLinkNotice {...linkNotice} onClose={() => setLinkNotice(null)} />}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden.')
  return ctx
}
