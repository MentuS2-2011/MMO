import React, { createContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Cookies from 'js-cookie'

export const AuthContext = createContext()

// ── Helpers de cookie ─────────────────────────────────────────────────────────
const COOKIE_OPTS_SESSION = { sameSite: 'strict', path: '/' }
const COOKIE_OPTS_PERSIST = { ...COOKIE_OPTS_SESSION, expires: 30 }

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Restaurar sessão ao abrir o site ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      try {
        const token = Cookies.get('mmo_session')

        if (!token) {
          // Sem cookie — não logado, libera a tela imediatamente
          if (!cancelled) setLoading(false)
          return
        }

        // Timeout de segurança: se Supabase demorar > 5s, libera a tela
        const timeout = setTimeout(() => {
          if (!cancelled) {
            console.warn('Timeout ao restaurar sessão — cookie removido')
            Cookies.remove('mmo_session', { path: '/' })
            Cookies.remove('mmo_uid',     { path: '/' })
            setLoading(false)
          }
        }, 5000)

        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('session_token', token)
          .single()

        clearTimeout(timeout)

        if (cancelled) return

        if (!error && data) {
          setUser(data)
          // Atualiza último acesso em background — sem awaitar
          supabase
            .from('usuarios')
            .update({ ultimo_acesso: new Date().toISOString() })
            .eq('id', data.id)
            .then(() => {})
            .catch(() => {})
        } else {
          // Token inválido ou expirado — limpa cookies
          Cookies.remove('mmo_session', { path: '/' })
          Cookies.remove('mmo_uid',     { path: '/' })
        }
      } catch (err) {
        // Qualquer erro (rede, Supabase fora do ar) — não trava a tela
        console.error('Erro ao restaurar sessão:', err)
        Cookies.remove('mmo_session', { path: '/' })
        Cookies.remove('mmo_uid',     { path: '/' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restore()
    return () => { cancelled = true }
  }, [])

  // ── Login: grava cookies ──────────────────────────────────────────────────
  // rememberMe=true  → cookie dura 30 dias (persiste ao fechar o browser)
  // rememberMe=false → cookie de sessão (some ao fechar o browser)
  const login = (userData, rememberMe = true) => {
    setUser(userData)

    if (userData?.session_token) {
      const opts = rememberMe ? COOKIE_OPTS_PERSIST : COOKIE_OPTS_SESSION
      Cookies.set('mmo_session', userData.session_token, opts)
      Cookies.set('mmo_uid',     String(userData.id),    opts)
    }
  }

  // ── Logout: limpa tudo ────────────────────────────────────────────────────
  const logout = () => {
    const uid = Cookies.get('mmo_uid')
    setUser(null)
    Cookies.remove('mmo_session', { path: '/' })
    Cookies.remove('mmo_uid',     { path: '/' })

    // Invalida token no banco em background
    if (uid) {
      supabase
        .from('usuarios')
        .update({ session_token: null })
        .eq('id', uid)
        .then(() => {})
        .catch(() => {})
    }
  }

  // ── Atualiza dados do usuário no contexto (ex: após editar perfil) ────────
  const updateUser = (updatedFields) =>
    setUser(prev => ({ ...prev, ...updatedFields }))

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}