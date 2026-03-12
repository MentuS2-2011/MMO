import React, { createContext, useState, useEffect } from 'react'
import { authService } from '../services/auth'
import { cookieUtils } from '../utils/cookies'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkLogin = async () => {
      try {
        // Primeiro, verificar cookies
        const userId = cookieUtils.getUserId()
        const sessionToken = cookieUtils.getSessionToken()

        if (userId && sessionToken) {
          const result = await authService.loginWithCookie(sessionToken)
          if (result.success) {
            setUser(result.user)
            setLoading(false)
            return
          }
        }

        // Fallback para localStorage
        const localUser = cookieUtils.getFromLocalStorage()
        if (localUser) {
          setUser(localUser)
        }
      } catch (error) {
        console.error('Erro ao verificar login:', error)
      } finally {
        setLoading(false)
      }
    }

    checkLogin()
  }, [])

  const login = (userData) => {
    setUser(userData)
  }

  const logout = () => {
    setUser(null)
    cookieUtils.clearSession()
    localStorage.removeItem('mmo_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}