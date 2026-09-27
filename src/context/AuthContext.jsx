import React, { createContext, useContext, useState, useEffect } from 'react'
import { loginWithEmail, logoutUser, onAuthChange } from '../services/authService'
import { loadProfile } from '../services/profileService'
import { checkLoginLocation } from '../services/loginAlertService'
import { syncUserDoc } from '../services/userService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoggedIn,  setIsLoggedIn]  = useState(false)
  const [authReady,   setAuthReady]   = useState(false)

  useEffect(() => {
    return onAuthChange((authUser) => {
      if (authUser) {
        const profile = loadProfile()
        const username = profile?.username ?? authUser.email.split('@')[0]
        setCurrentUser({
          userId:   authUser.uid,
          username,
          email:    authUser.email,
        })
        setIsLoggedIn(true)
        syncUserDoc(authUser.uid, username, profile?.socialLinks ?? {}, profile?.favoriteGames ?? null).catch(() => {})
      } else {
        setCurrentUser(null)
        setIsLoggedIn(false)
      }
      setAuthReady(true)
    })
  }, [])

  const login = async (email, password, rememberMe = true) => {
    const { user } = await loginWithEmail(email, password, rememberMe)
    const profile  = loadProfile()
    const userData = {
      userId:   user.uid,
      username: profile?.username ?? email.split('@')[0],
      email:    user.email,
    }
    setCurrentUser(userData)
    setIsLoggedIn(true)
    checkLoginLocation() // fire-and-forget
    return userData
  }

  // Direkt nach Registrierung – PocketBase hat User bereits eingeloggt
  const loginDirect = (user) => {
    setCurrentUser({ userId: user.userId, username: user.username, email: user.email ?? '' })
    setIsLoggedIn(true)
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
    <AuthContext.Provider value={{ isLoggedIn, currentUser, login, loginDirect, logout, updateUsername }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden.')
  return ctx
}
