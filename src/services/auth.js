import { supabase } from './supabase'
import { validators } from '../utils/validators'
import { cookieUtils } from '../utils/cookies'

export const authService = {
  async login(nome, senha, rememberMe = true) {
    try {
      const hashedSenha = await validators.hashPassword(senha)
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('nome', nome)
        .eq('senha', hashedSenha)
        .single()

      if (error || !data) {
        throw new Error('Nome ou senha inválidos')
      }

      // Gerar token de sessão único
      const sessionToken = Math.random().toString(36).substring(2) + 
                          Date.now().toString(36) + 
                          Math.random().toString(36).substring(2)

      // Salvar token no banco
      await supabase
        .from('usuarios')
        .update({ 
          session_token: sessionToken,
          ultimo_acesso: new Date() 
        })
        .eq('id', data.id)

      // IMPORTANTE: Usar o cookieUtils com rememberMe
      cookieUtils.setUserSession(data.id, sessionToken, rememberMe)
      
      // Backup em localStorage
      cookieUtils.saveToLocalStorage(data)

      return { 
        success: true, 
        user: { ...data, session_token: sessionToken } 
      }
    } catch (error) {
      console.error('Erro no login:', error)
      return { success: false, error: error.message }
    }
  },

  async loginWithCookie() {
    try {
      const sessionToken = cookieUtils.getSessionToken()
      const userId = cookieUtils.getUserId()

      if (!sessionToken || !userId) {
        throw new Error('Sessão não encontrada')
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .eq('session_token', sessionToken)
        .single()

      if (error || !data) {
        cookieUtils.clearSession()
        throw new Error('Sessão inválida')
      }

      // Atualizar último acesso
      await supabase
        .from('usuarios')
        .update({ ultimo_acesso: new Date() })
        .eq('id', data.id)

      return { success: true, user: data }
    } catch (error) {
      console.error('Erro no login com cookie:', error)
      return { success: false, error: error.message }
    }
  },
  
  async atualizarFotoPerfil(userId, fotoUrl) {
  try {
    const { error } = await supabase
      .from('usuarios')
      .update({ foto_perfil: fotoUrl })
      .eq('id', userId)

    if (error) throw error

    return { success: true, message: 'Foto atualizada com sucesso' }
  } catch (error) {
    console.error('Erro ao atualizar foto:', error)
    return { success: false, error: error.message }
  }
},

  // ... resto das funções (cadastrar, recuperarSenha, etc) permanecem iguais

  async logout(userId) {
    try {
      await supabase
        .from('usuarios')
        .update({ session_token: null })
        .eq('id', userId)

      cookieUtils.clearSession()
      cookieUtils.clearLocalStorage()
      
      return { success: true }
    } catch (error) {
      console.error('Erro no logout:', error)
      return { success: false, error: error.message }
    }
  }
}