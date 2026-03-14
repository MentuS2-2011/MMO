import { supabase } from './supabase'

export const amizadesService = {

  // ── Busca usuários pelo nome (exclui o próprio usuário) ───────────────────
  buscarPorNome: async (busca, meuId) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, nivel, gold, foto_perfil')
        .ilike('nome', `%${busca}%`)
        .neq('id', meuId)
        .limit(20)

      if (error) throw error
      return { success: true, usuarios: data || [] }
    } catch (err) {
      return { success: false, error: 'Erro ao buscar usuários.', usuarios: [] }
    }
  },

  // ── Envia solicitação de amizade ──────────────────────────────────────────
  enviarSolicitacao: async (meuId, destinatarioId) => {
    try {
      // Verifica se já existe alguma relação
      const { data: existente } = await supabase
        .from('amizades')
        .select('id, status, solicitante_id')
        .or(
          `and(solicitante_id.eq.${meuId},destinatario_id.eq.${destinatarioId}),` +
          `and(solicitante_id.eq.${destinatarioId},destinatario_id.eq.${meuId})`
        )
        .maybeSingle()

      if (existente) {
        if (existente.status === 'aceita') return { success: false, error: 'Já são amigos.' }
        if (existente.status === 'pendente') return { success: false, error: 'Solicitação já enviada.' }
        // Se foi recusada, permite reenviar deletando o registro
        await supabase.from('amizades').delete().eq('id', existente.id)
      }

      const { error } = await supabase
        .from('amizades')
        .insert([{ solicitante_id: meuId, destinatario_id: destinatarioId }])

      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: 'Erro ao enviar solicitação.' }
    }
  },

  // ── Aceita / recusa solicitação ───────────────────────────────────────────
  responderSolicitacao: async (amizadeId, aceitar) => {
    try {
      const { error } = await supabase
        .from('amizades')
        .update({ status: aceitar ? 'aceita' : 'recusada' })
        .eq('id', amizadeId)

      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: 'Erro ao responder solicitação.' }
    }
  },

  // ── Remove amigo ──────────────────────────────────────────────────────────
  removerAmigo: async (meuId, amigoId) => {
    try {
      const { error } = await supabase
        .from('amizades')
        .delete()
        .or(
          `and(solicitante_id.eq.${meuId},destinatario_id.eq.${amigoId}),` +
          `and(solicitante_id.eq.${amigoId},destinatario_id.eq.${meuId})`
        )

      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: 'Erro ao remover amigo.' }
    }
  },

  // ── Lista amigos aceitos de um usuário ────────────────────────────────────
  listarAmigos: async (meuId) => {
    try {
      const { data, error } = await supabase
        .from('amizades')
        .select(`
          id,
          status,
          solicitante_id,
          destinatario_id,
          criado_em
        `)
        .or(`solicitante_id.eq.${meuId},destinatario_id.eq.${meuId}`)
        .eq('status', 'aceita')

      if (error) throw error

      // Busca dados dos amigos em paralelo
      const amigosIds = (data || []).map(a =>
        a.solicitante_id === meuId ? a.destinatario_id : a.solicitante_id
      )

      if (amigosIds.length === 0) return { success: true, amigos: [] }

      const { data: usuarios, error: errU } = await supabase
        .from('usuarios')
        .select('id, nome, nivel, gold, foto_perfil, conquistas')
        .in('id', amigosIds)

      if (errU) throw errU

      // Enriquece com o id da amizade para poder remover
      const amigos = (usuarios || []).map(u => {
        const rel = data.find(a =>
          a.solicitante_id === u.id || a.destinatario_id === u.id
        )
        return { ...u, amizade_id: rel?.id }
      })

      return { success: true, amigos }
    } catch (err) {
      return { success: false, error: 'Erro ao carregar amigos.', amigos: [] }
    }
  },

  // ── Lista solicitações pendentes recebidas ────────────────────────────────
  listarSolicitacoesPendentes: async (meuId) => {
    try {
      const { data, error } = await supabase
        .from('amizades')
        .select('id, criado_em, solicitante_id')
        .eq('destinatario_id', meuId)
        .eq('status', 'pendente')

      if (error) throw error
      if (!data || data.length === 0) return { success: true, solicitacoes: [] }

      const ids = data.map(d => d.solicitante_id)
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, nome, nivel, foto_perfil')
        .in('id', ids)

      const solicitacoes = data.map(s => {
        const u = (usuarios || []).find(u => u.id === s.solicitante_id)
        return { amizade_id: s.id, criado_em: s.criado_em, ...u }
      })

      return { success: true, solicitacoes }
    } catch (err) {
      return { success: false, error: 'Erro ao carregar solicitações.', solicitacoes: [] }
    }
  },

  // ── Ranking de amigos (por gold) ──────────────────────────────────────────
  rankingAmigos: async (meuId) => {
    try {
      const { amigos } = await amizadesService.listarAmigos(meuId)

      // Inclui o próprio usuário no ranking
      const { data: eu } = await supabase
        .from('usuarios')
        .select('id, nome, nivel, gold, foto_perfil, conquistas')
        .eq('id', meuId)
        .single()

      const todos = [...(amigos || []), ...(eu ? [eu] : [])]
      todos.sort((a, b) => (b.gold ?? 0) - (a.gold ?? 0))

      return { success: true, ranking: todos }
    } catch (err) {
      return { success: false, error: 'Erro ao carregar ranking.', ranking: [] }
    }
  },

  // ── Retorna status da relação entre dois usuários ─────────────────────────
  // 'nenhum' | 'pendente_enviado' | 'pendente_recebido' | 'aceita'
  statusRelacao: async (meuId, outroId) => {
    try {
      const { data } = await supabase
        .from('amizades')
        .select('id, status, solicitante_id')
        .or(
          `and(solicitante_id.eq.${meuId},destinatario_id.eq.${outroId}),` +
          `and(solicitante_id.eq.${outroId},destinatario_id.eq.${meuId})`
        )
        .maybeSingle()

      if (!data) return { status: 'nenhum' }
      if (data.status === 'aceita') return { status: 'aceita', amizadeId: data.id }
      if (data.status === 'pendente') {
        return {
          status: data.solicitante_id === meuId ? 'pendente_enviado' : 'pendente_recebido',
          amizadeId: data.id
        }
      }
      return { status: 'nenhum' }
    } catch {
      return { status: 'nenhum' }
    }
  },
}