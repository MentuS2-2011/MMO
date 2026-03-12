import Cookies from 'js-cookie'

export const cookieUtils = {
  defaultConfig: {
    expires: 7,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  },

  setUserSession(userId, token) {
    Cookies.set('userId', userId, this.defaultConfig)
    Cookies.set('sessionToken', token, this.defaultConfig)
    Cookies.set('lastVisited', new Date().toISOString(), this.defaultConfig)
  },

  setUserPreferences(prefs) {
    Cookies.set('userPrefs', JSON.stringify(prefs), { ...this.defaultConfig, expires: 30 })
  },

  getUserId() {
    return Cookies.get('userId')
  },

  getSessionToken() {
    return Cookies.get('sessionToken')
  },

  getUserPreferences() {
    const prefs = Cookies.get('userPrefs')
    return prefs ? JSON.parse(prefs) : {}
  },

  isLoggedIn() {
    return !!(this.getUserId() && this.getSessionToken())
  },

  clearSession() {
    Cookies.remove('userId', { path: '/' })
    Cookies.remove('sessionToken', { path: '/' })
    Cookies.remove('lastVisited', { path: '/' })
    Cookies.remove('userPrefs', { path: '/' })
  },

  syncWithLocalStorage(userData) {
    localStorage.setItem('mmo_user', JSON.stringify({
      ...userData,
      cookieExpiry: Date.now() + (7 * 24 * 60 * 60 * 1000)
    }))
  },

  getFromLocalStorage() {
    const userStr = localStorage.getItem('mmo_user')
    if (!userStr) return null
    
    try {
      const user = JSON.parse(userStr)
      if (user.cookieExpiry && Date.now() > user.cookieExpiry) {
        localStorage.removeItem('mmo_user')
        return null
      }
      return user
    } catch {
      return null
    }
  }
}