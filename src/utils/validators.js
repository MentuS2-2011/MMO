export const validators = {
  // Validação de senha forte
  isStrongPassword(password) {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?°ªº]/.test(password)
    
    const errors = []
    
    if (password.length < minLength) {
      errors.push(`Mínimo de ${minLength} caracteres`)
    }
    if (!hasUpperCase) {
      errors.push('Pelo menos uma letra maiúscula')
    }
    if (!hasLowerCase) {
      errors.push('Pelo menos uma letra minúscula')
    }
    if (!hasNumbers) {
      errors.push('Pelo menos um número')
    }
    if (!hasSpecialChar) {
      errors.push('Pelo menos um caractere especial (!@#$%^&*)')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Hash SHA-256
  async hashPassword(password) {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }
}