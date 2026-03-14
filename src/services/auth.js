import { supabase } from './supabase'

// ── Hash SHA-256 (igual ao original) ─────────────────────────────────────────
const hashSenha = async (senha) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(senha)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Gera session_token aleatório ──────────────────────────────────────────────
const gerarToken = () => {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Interpreta erros do Supabase em PT-BR ─────────────────────────────────────
const traduzirErro = (error) => {
  if (!error) return 'Erro desconhecido'
  const msg = error.message || error.details || ''
  if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists')) {
    if (msg.toLowerCase().includes('nome') || msg.toLowerCase().includes('name')) {
      return 'Este nome já está em uso. Escolha outro nome.'
    }
    if (msg.toLowerCase().includes('email')) {
      return 'Este e-mail já está cadastrado.'
    }
    return 'Já existe um cadastro com esses dados.'
  }
  if (msg.includes('violates unique constraint "idx_usuarios_nome_unique"')) {
    return 'Este nome já está em uso. Escolha outro nome.'
  }
  return msg || 'Erro desconhecido'
}

export const authService = {

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  login: async (nome, senha) => {
    try {
      const senhaHash = await hashSenha(senha)

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('nome', nome)
        .eq('senha', senhaHash)
        .single()

      if (error || !data) {
        return { success: false, error: 'Nome ou senha incorretos.' }
      }

      // Gera novo session_token
      const token = gerarToken()
      await supabase
        .from('usuarios')
        .update({
          session_token: token,
          ultimo_acesso: new Date().toISOString()
        })
        .eq('id', data.id)

      return { success: true, user: { ...data, session_token: token } }
    } catch (err) {
      console.error('Login error:', err)
      return { success: false, error: 'Falha ao conectar. Tente novamente.' }
    }
  },

  // ── CADASTRO ───────────────────────────────────────────────────────────────
  cadastrar: async (nome, email, senha) => {
    try {
      // Verifica nome duplicado manualmente (LOWER para case-insensitive)
      const { data: nomeExiste } = await supabase
        .from('usuarios')
        .select('id')
        .ilike('nome', nome)
        .maybeSingle()

      if (nomeExiste) {
        return { success: false, error: 'Este nome já está em uso. Escolha outro nome.' }
      }

      // Verifica email duplicado
      const { data: emailExiste } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      if (emailExiste) {
        return { success: false, error: 'Este e-mail já está cadastrado.' }
      }

      const senhaHash = await hashSenha(senha)

      const { data, error } = await supabase
        .from('usuarios')
        .insert([{
          nome:  nome.trim(),
          email: email.toLowerCase().trim(),
          senha: senhaHash,
          gold:  50,
          nivel: 1,
          conquistas: 0,
        }])
        .select()
        .single()

      if (error) {
        return { success: false, error: traduzirErro(error) }
      }

      return { success: true, user: data }
    } catch (err) {
      console.error('Cadastro error:', err)
      return { success: false, error: 'Falha ao conectar. Tente novamente.' }
    }
  },

  // ── RECUPERAR SENHA — Etapa 1: envia código por e-mail ────────────────────
  // ⚠️ O envio de e-mail usa Resend (https://resend.com).
  // Configure sua RESEND_API_KEY em: Supabase → Edge Functions → Secrets
  // OU substitua o fetch abaixo pelo seu provedor de e-mail preferido.
  enviarCodigoRecuperacao: async (email) => {
    try {
      // Verifica se o e-mail existe
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()

      if (error) throw error

      if (!usuario) {
        // Não revela se o e-mail existe ou não (segurança)
        return { success: true, message: 'Se este e-mail estiver cadastrado, você receberá o código em breve.' }
      }

      // Gera código de 4 dígitos
      const codigo = String(Math.floor(1000 + Math.random() * 9000))
      const expira_em = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutos

      // Invalida códigos anteriores para este e-mail
      await supabase
        .from('recuperacao_senha')
        .update({ usado: true })
        .eq('email', email.toLowerCase().trim())
        .eq('usado', false)

      // Salva o novo código
      const { error: insertError } = await supabase
        .from('recuperacao_senha')
        .insert([{
          email:     email.toLowerCase().trim(),
          codigo,
          expira_em,
        }])

      if (insertError) throw insertError

      // ── Envia o e-mail ────────────────────────────────────────────────────
      // Opção A: Supabase Edge Function (recomendado para produção)
      // const { error: fnError } = await supabase.functions.invoke('enviar-email', {
      //   body: { email, codigo, nome: usuario.nome }
      // })

      // Opção B: Resend direto (só funciona se o domínio estiver verificado)
      // const res = await fetch('https://api.resend.com/emails', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`
      //   },
      //   body: JSON.stringify({
      //     from: 'GAME MMO <noreply@seudominio.com>',
      //     to: email,
      //     subject: 'Código de recuperação de senha',
      //     html: `
      //       <h2>Olá, ${usuario.nome}!</h2>
      //       <p>Seu código de recuperação de senha é:</p>
      //       <h1 style="letter-spacing:10px;font-size:48px;color:#ffd700">${codigo}</h1>
      //       <p>Este código expira em <strong>15 minutos</strong>.</p>
      //       <p>Se você não solicitou isso, ignore este e-mail.</p>
      //     `
      //   })
      // })

      // MODO DESENVOLVIMENTO: loga o código no console
      // Remova isso em produção e ative uma das opções acima!
      console.log(`[DEV] Código de recuperação para ${email}: ${codigo}`)

      return {
        success: true,
        message: 'Código enviado para o seu e-mail.',
        // Em dev, retorna o código para facilitar testes
        _devCodigo: import.meta.env.DEV ? codigo : undefined
      }
    } catch (err) {
      console.error('Recuperação error:', err)
      return { success: false, error: 'Erro ao enviar código. Tente novamente.' }
    }
  },

  // ── RECUPERAR SENHA — Etapa 2: valida código ──────────────────────────────
  validarCodigo: async (email, codigo) => {
    try {
      const { data, error } = await supabase
        .from('recuperacao_senha')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('codigo', codigo.trim())
        .eq('usado', false)
        .gte('expira_em', new Date().toISOString())
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        // Incrementa tentativas no registro mais recente
        const { data: recente } = await supabase
          .from('recuperacao_senha')
          .select('id, tentativas')
          .eq('email', email.toLowerCase().trim())
          .eq('usado', false)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (recente) {
          const novasTentativas = (recente.tentativas || 0) + 1
          await supabase
            .from('recuperacao_senha')
            .update({ tentativas: novasTentativas, usado: novasTentativas >= 5 })
            .eq('id', recente.id)

          if (novasTentativas >= 5) {
            return { success: false, error: 'Muitas tentativas erradas. Solicite um novo código.' }
          }
          return { success: false, error: `Código inválido. ${5 - novasTentativas} tentativa(s) restante(s).` }
        }

        return { success: false, error: 'Código inválido ou expirado.' }
      }

      return { success: true, registroId: data.id }
    } catch (err) {
      console.error('Validar código error:', err)
      return { success: false, error: 'Erro ao validar código. Tente novamente.' }
    }
  },

  // ── RECUPERAR SENHA — Etapa 3: salva nova senha ───────────────────────────
  resetarSenha: async (email, registroId, novaSenha) => {
    try {
      const senhaHash = await hashSenha(novaSenha)

      // Atualiza senha
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ senha: senhaHash })
        .eq('email', email.toLowerCase().trim())

      if (updateError) throw updateError

      // Marca o código como usado
      await supabase
        .from('recuperacao_senha')
        .update({ usado: true })
        .eq('id', registroId)

      return { success: true }
    } catch (err) {
      console.error('Resetar senha error:', err)
      return { success: false, error: 'Erro ao salvar nova senha. Tente novamente.' }
    }
  },

  // ── ATUALIZAR FOTO DE PERFIL ──────────────────────────────────────────────
  atualizarFotoPerfil: async (usuarioId, arquivo) => {
    try {
      const ext = arquivo.name.split('.').pop().toLowerCase()
      const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif']
      if (!allowed.includes(ext)) {
        return { success: false, error: 'Formato inválido. Use JPG, PNG ou WebP.' }
      }
      if (arquivo.size > 5 * 1024 * 1024) {
        return { success: false, error: 'Imagem muito grande. Máximo 5MB.' }
      }

      const path = `${usuarioId}/avatar.${ext}`

      // Remove foto anterior (ignora erro se não existir)
      await supabase.storage.from('perfil').remove([path])

      const { error: uploadError } = await supabase.storage
        .from('perfil')
        .upload(path, arquivo, { upsert: true, contentType: arquivo.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('perfil')
        .getPublicUrl(path)

      // Adiciona timestamp para forçar reload do cache
      const urlComCache = `${publicUrl}?t=${Date.now()}`

      const { error: dbError } = await supabase
        .from('usuarios')
        .update({ foto_perfil: urlComCache })
        .eq('id', usuarioId)

      if (dbError) throw dbError

      return { success: true, url: urlComCache }
    } catch (err) {
      console.error('Upload foto error:', err)
      return { success: false, error: 'Erro ao enviar imagem. Tente novamente.' }
    }
  },

  // ── ATUALIZAR PERFIL (nome, descricao) ────────────────────────────────────
  atualizarPerfil: async (usuarioId, campos) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .update(campos)
        .eq('id', usuarioId)
        .select()
        .single()

      if (error) return { success: false, error: traduzirErro(error) }
      return { success: true, user: data }
    } catch (err) {
      return { success: false, error: 'Erro ao atualizar perfil.' }
    }
  },
}