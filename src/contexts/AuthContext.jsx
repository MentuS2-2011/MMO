import React, { createContext, useState, useEffect } from 'react'
import { authService } from '../services/auth'
import { cookieUtils } from '../utils/cookies'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      try {
        // Tentar login via cookie primeiro
        const result = await authService.loginWithCookie()
        
        if (isMounted) {
          if (result.success) {
            setUser(result.user)
          } else {
            // Se não funcionar, tentar localStorage
            const localUser = cookieUtils.getFromLocalStorage()
            if (localUser) {
              setUser(localUser)
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkSession()

    return () => {
      isMounted = false
    }
  }, [])

  const login = (userData, rememberMe = true) => {
    setUser(userData)
    // Os cookies já foram salvos no authService.login
  }

  const logout = async () => {
    if (user?.id) {
      await authService.logout(user.id)
    }
    setUser(null)
  }

  const updateUser = (updatedFields) => {
    setUser(prev => ({ ...prev, ...updatedFields }))
    // Atualizar localStorage também
    const localUser = cookieUtils.getFromLocalStorage()
    if (localUser) {
      cookieUtils.saveToLocalStorage({ ...localUser, ...updatedFields })
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}