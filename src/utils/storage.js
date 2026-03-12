const USER_KEY = 'mmo_user'

export const storage = {
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  getUser() {
    const user = localStorage.getItem(USER_KEY)
    return user ? JSON.parse(user) : null
  },

  removeUser() {
    localStorage.removeItem(USER_KEY)
  }
}