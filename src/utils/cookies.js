import Cookies from 'js-cookie'

export const cookieUtils = {
  // Usar apenas um padrão de cookies
  defaultConfig: {
    expires: 7, // 7 dias
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  },

  // Config para "lembrar-me" (30 dias)
  persistentConfig: {
    expires: 30,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  },

  // Salvar sessão (pode ser persistente ou não)
  setUserSession(userId, token, rememberMe = true) {
    const config = rememberMe ? this.persistentConfig : { ...this.defaultConfig, expires: undefined } // expires: undefined = sessão
    Cookies.set('session_token', token, config)
    Cookies.set('user_id', userId, config)
    Cookies.set('last_visit', new Date().toISOString(), config)
  },

  getSessionToken() {
    return Cookies.get('session_token')
  },

  getUserId() {
    return Cookies.get('user_id')
  },

  clearSession() {
    Cookies.remove('session_token', { path: '/' })
    Cookies.remove('user_id', { path: '/' })
    Cookies.remove('last_visit', { path: '/' })
    Cookies.remove('user_prefs', { path: '/' })
  },

  setUserPreferences(prefs) {
    Cookies.set('user_prefs', JSON.stringify(prefs), this.persistentConfig)
  },

  getUserPreferences() {
    const prefs = Cookies.get('user_prefs')
    return prefs ? JSON.parse(prefs) : {}
  },

  // Fallback para localStorage
  saveToLocalStorage(userData) {
    localStorage.setItem('user_backup', JSON.stringify({
      ...userData,
      expiry: Date.now() + (30 * 24 * 60 * 60 * 1000)
    }))
  },

  getFromLocalStorage() {
    const data = localStorage.getItem('user_backup')
    if (!data) return null
    
    try {
      const parsed = JSON.parse(data)
      if (parsed.expiry && Date.now() > parsed.expiry) {
        localStorage.removeItem('user_backup')
        return null
      }
      return parsed
    } catch {
      return null
    }
  },

  clearLocalStorage() {
    localStorage.removeItem('user_backup')
  }
}