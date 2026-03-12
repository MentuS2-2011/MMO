import { supabase } from './supabase'
import { validators } from '../utils/validators'
import { cookieUtils } from '../utils/cookies'

export const authService = {
  async login(nome, senha) {
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

      // Criar cookie
      cookieUtils.setUserSession(data.id, sessionToken)
      
      // Sincronizar com localStorage (fallback)
      cookieUtils.syncWithLocalStorage(data)

      return { success: true, user: data }
    } catch (error) {
      console.error('Erro no login:', error)
      return { success: false, error: error.message }
    }
  },

  async loginWithCookie(token) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('session_token', token)
        .single()

      if (error || !data) {
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

  async cadastrar(nome, email, senha) {
    try {
      // Verificar se usuário já existe
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('email')
        .eq('email', email)
        .single()

      if (existingUser) {
        throw new Error('E-mail já cadastrado')
      }

      // Hash da senha
      const hashedSenha = await validators.hashPassword(senha)

      const { data, error } = await supabase
        .from('usuarios')
        .insert([
          {
            nome,
            email,
            senha: hashedSenha,
            gold: 50,
            criado_em: new Date(),
            ultimo_acesso: new Date()
          }
        ])
        .select()
        .single()

      if (error) throw error

      return { success: true, user: data }
    } catch (error) {
      console.error('Erro no cadastro:', error)
      return { success: false, error: error.message }
    }
  },

  async recuperarSenha(email) {
    try {
      // Verificar se email existe
      const { data: user, error } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('email', email)
        .single()

      if (error || !user) {
        throw new Error('E-mail não encontrado')
      }

      // Gerar token de recuperação (válido por 1 hora)
      const token = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15)
      const expira = new Date()
      expira.setHours(expira.getHours() + 1)

      // Salvar token no banco
      await supabase
        .from('recuperacao_senha')
        .insert([
          {
            usuario_id: user.id,
            token,
            expira_em: expira,
            usado: false
          }
        ])

      // Aqui você integraria com serviço de email
      console.log(`Token de recuperação para ${email}: ${token}`)

      return { 
        success: true, 
        message: 'E-mail de recuperação enviado com sucesso!' 
      }
    } catch (error) {
      console.error('Erro na recuperação de senha:', error)
      return { success: false, error: error.message }
    }
  },

  async resetarSenha(token, novaSenha) {
    try {
      // Verificar token
      const { data: recovery, error } = await supabase
        .from('recuperacao_senha')
        .select('*')
        .eq('token', token)
        .eq('usado', false)
        .single()

      if (error || !recovery) {
        throw new Error('Token inválido ou expirado')
      }

      // Verificar se token expirou
      if (new Date() > new Date(recovery.expira_em)) {
        throw new Error('Token expirado')
      }

      // Hash da nova senha
      const hashedSenha = await validators.hashPassword(novaSenha)

      // Atualizar senha
      await supabase
        .from('usuarios')
        .update({ senha: hashedSenha })
        .eq('id', recovery.usuario_id)

      // Marcar token como usado
      await supabase
        .from('recuperacao_senha')
        .update({ usado: true })
        .eq('id', recovery.id)

      return { success: true, message: 'Senha alterada com sucesso!' }
    } catch (error) {
      console.error('Erro ao resetar senha:', error)
      return { success: false, error: error.message }
    }
  },

  async logout(userId) {
    try {
      await supabase
        .from('usuarios')
        .update({ session_token: null })
        .eq('id', userId)

      cookieUtils.clearSession()
      localStorage.removeItem('mmo_user')
      
      return { success: true }
    } catch (error) {
      console.error('Erro no logout:', error)
      return { success: false, error: error.message }
    }
  },

  async verificarSessao() {
    try {
      // Primeiro, verificar cookies
      const userId = cookieUtils.getUserId()
      const sessionToken = cookieUtils.getSessionToken()

      if (userId && sessionToken) {
        const result = await this.loginWithCookie(sessionToken)
        if (result.success) {
          return { success: true, user: result.user }
        }
      }

      // Fallback para localStorage
      const localUser = cookieUtils.getFromLocalStorage()
      if (localUser) {
        return { success: true, user: localUser }
      }

      return { success: false, error: 'Nenhuma sessão ativa' }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error)
      return { success: false, error: error.message }
    }
  },

  async atualizarUltimoAcesso(userId) {
    try {
      await supabase
        .from('usuarios')
        .update({ ultimo_acesso: new Date() })
        .eq('id', userId)
      
      return { success: true }
    } catch (error) {
      console.error('Erro ao atualizar último acesso:', error)
      return { success: false, error: error.message }
    }
  },

  async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      return { success: true, user: data }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error)
      return { success: false, error: error.message }
    }
  },

  async getUserByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single()

      if (error) throw error

      return { success: true, user: data }
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error)
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

  async atualizarGold(userId, quantidade) {
    try {
      const { data: user } = await supabase
        .from('usuarios')
        .select('gold')
        .eq('id', userId)
        .single()

      const novoGold = user.gold + quantidade

      const { error } = await supabase
        .from('usuarios')
        .update({ gold: novoGold })
        .eq('id', userId)

      if (error) throw error

      return { success: true, gold: novoGold }
    } catch (error) {
      console.error('Erro ao atualizar gold:', error)
      return { success: false, error: error.message }
    }
  }
}