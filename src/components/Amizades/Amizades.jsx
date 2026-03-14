import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { amizadesService } from '../../services/amizadesService'
import './Amizades.css'

const Amizades = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [aba, setAba]                       = useState('amigos')   // amigos | buscar | pendentes
  const [busca, setBusca]                   = useState('')
  const [resultados, setResultados]         = useState([])
  const [amigos, setAmigos]                 = useState([])
  const [solicitacoes, setSolicitacoes]     = useState([])
  const [loadingBusca, setLoadingBusca]     = useState(false)
  const [loadingPagina, setLoadingPagina]   = useState(true)
  const [statusMap, setStatusMap]           = useState({})   // { userId: 'pendente_enviado' | 'aceita' | 'nenhum' }
  const [feedback, setFeedback]             = useState(null) // { tipo: 'ok'|'erro', msg: string }

  useEffect(() => {
    document.body.classList.remove('page-exit')
    document.body.classList.add('page-enter')
    return () => document.body.classList.remove('page-enter')
  }, [])

  const carregarDados = useCallback(async () => {
    setLoadingPagina(true)
    const [resAmigos, resPendentes] = await Promise.all([
      amizadesService.listarAmigos(user.id),
      amizadesService.listarSolicitacoesPendentes(user.id),
    ])
    if (resAmigos.success)   setAmigos(resAmigos.amigos)
    if (resPendentes.success) setSolicitacoes(resPendentes.solicitacoes)
    setLoadingPagina(false)
  }, [user.id])

  useEffect(() => { carregarDados() }, [carregarDados])

  // Pesquisa com debounce
  useEffect(() => {
    if (!busca.trim() || busca.length < 2) {
      setResultados([])
      return
    }
    const t = setTimeout(async () => {
      setLoadingBusca(true)
      const res = await amizadesService.buscarPorNome(busca, user.id)
      if (res.success) {
        setResultados(res.usuarios)
        // Busca status de cada resultado
        const statuses = {}
        await Promise.all(
          res.usuarios.map(async (u) => {
            const s = await amizadesService.statusRelacao(user.id, u.id)
            statuses[u.id] = s.status
          })
        )
        setStatusMap(statuses)
      }
      setLoadingBusca(false)
    }, 400)
    return () => clearTimeout(t)
  }, [busca, user.id])

  const mostrarFeedback = (tipo, msg) => {
    setFeedback({ tipo, msg })
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleAdicionar = async (destinatarioId) => {
    setStatusMap(prev => ({ ...prev, [destinatarioId]: 'enviando' }))
    const res = await amizadesService.enviarSolicitacao(user.id, destinatarioId)
    if (res.success) {
      setStatusMap(prev => ({ ...prev, [destinatarioId]: 'pendente_enviado' }))
      mostrarFeedback('ok', 'Solicitação enviada!')
    } else {
      setStatusMap(prev => ({ ...prev, [destinatarioId]: 'nenhum' }))
      mostrarFeedback('erro', res.error)
    }
  }

  const handleResponder = async (amizadeId, aceitar) => {
    const res = await amizadesService.responderSolicitacao(amizadeId, aceitar)
    if (res.success) {
      mostrarFeedback('ok', aceitar ? 'Amizade aceita!' : 'Solicitação recusada.')
      carregarDados()
    } else {
      mostrarFeedback('erro', res.error)
    }
  }

  const handleRemover = async (amigoId, amizadeId) => {
    if (!window.confirm('Remover este amigo?')) return
    const res = await amizadesService.removerAmigo(user.id, amigoId)
    if (res.success) {
      setAmigos(prev => prev.filter(a => a.id !== amigoId))
      mostrarFeedback('ok', 'Amigo removido.')
    } else {
      mostrarFeedback('erro', res.error)
    }
  }

  const getInitials = (nome) => {
    if (!nome) return '?'
    return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  const BotaoAdicionar = ({ userId }) => {
    const s = statusMap[userId]
    if (s === 'aceita')           return <span className="tag-amigo">✓ Amigos</span>
    if (s === 'pendente_enviado') return <span className="tag-pendente">⏳ Enviado</span>
    if (s === 'pendente_recebido') return <span className="tag-pendente">📬 Recebida</span>
    if (s === 'enviando')         return <span className="tag-pendente">…</span>
    return (
      <button className="btn-adicionar" onClick={() => handleAdicionar(userId)}>
        + Adicionar
      </button>
    )
  }

  const CardUsuario = ({ u, acoes }) => (
    <div className="usuario-card">
      <div className="usuario-avatar">
        {u.foto_perfil
          ? <img src={u.foto_perfil} alt={u.nome} />
          : <span>{getInitials(u.nome)}</span>
        }
      </div>
      <div className="usuario-info">
        <span className="usuario-nome">{u.nome}</span>
        <span className="usuario-stats">⚔ Nv.{u.nivel ?? 1} &nbsp;⚜ {u.gold ?? 0} gold</span>
      </div>
      <div className="usuario-acoes">{acoes}</div>
    </div>
  )

  return (
    <div className="amizades-container">
      <div className="amizades-background"></div>

      {/* Toast */}
      {feedback && (
        <div className={`toast ${feedback.tipo}`}>{feedback.msg}</div>
      )}

      <div className="amizades-content">
        {/* Header */}
        <div className="amizades-header">
          <button className="btn-voltar" onClick={() => navigate('/home')}>← Voltar</button>
          <h1>👥 Amizades</h1>
          <div></div>
        </div>

        {/* Abas */}
        <div className="abas">
          <button
            className={`aba ${aba === 'amigos' ? 'active' : ''}`}
            onClick={() => setAba('amigos')}
          >
            Meus Amigos
            <span className="badge">{amigos.length}</span>
          </button>
          <button
            className={`aba ${aba === 'buscar' ? 'active' : ''}`}
            onClick={() => setAba('buscar')}
          >
            Buscar
          </button>
          <button
            className={`aba ${aba === 'pendentes' ? 'active' : ''}`}
            onClick={() => setAba('pendentes')}
          >
            Pendentes
            {solicitacoes.length > 0 && (
              <span className="badge alert">{solicitacoes.length}</span>
            )}
          </button>
        </div>

        {/* ─── ABA: MEUS AMIGOS ─── */}
        {aba === 'amigos' && (
          <div className="aba-content">
            {loadingPagina ? (
              <div className="loading-spinner"><div className="loader"></div></div>
            ) : amigos.length === 0 ? (
              <div className="empty-state">
                <span>🤝</span>
                <p>Nenhum amigo ainda.</p>
                <button onClick={() => setAba('buscar')}>Buscar jogadores</button>
              </div>
            ) : (
              <div className="lista-usuarios">
                {amigos.map(a => (
                  <CardUsuario
                    key={a.id}
                    u={a}
                    acoes={
                      <button
                        className="btn-remover"
                        onClick={() => handleRemover(a.id, a.amizade_id)}
                        title="Remover amigo"
                      >
                        ✕
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── ABA: BUSCAR ─── */}
        {aba === 'buscar' && (
          <div className="aba-content">
            <div className="busca-wrapper">
              <span className="busca-icon">🔍</span>
              <input
                type="text"
                placeholder="Buscar jogadores pelo nome…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="busca-input"
                autoFocus
              />
              {busca && (
                <button className="busca-clear" onClick={() => setBusca('')}>✕</button>
              )}
            </div>

            {loadingBusca && (
              <div className="loading-spinner"><div className="loader"></div></div>
            )}

            {!loadingBusca && busca.length >= 2 && resultados.length === 0 && (
              <div className="empty-state">
                <span>🔎</span>
                <p>Nenhum jogador encontrado para "{busca}".</p>
              </div>
            )}

            {!loadingBusca && resultados.length > 0 && (
              <div className="lista-usuarios">
                {resultados.map(u => (
                  <CardUsuario
                    key={u.id}
                    u={u}
                    acoes={<BotaoAdicionar userId={u.id} />}
                  />
                ))}
              </div>
            )}

            {!busca && (
              <p className="busca-hint">Digite pelo menos 2 caracteres para buscar</p>
            )}
          </div>
        )}

        {/* ─── ABA: PENDENTES ─── */}
        {aba === 'pendentes' && (
          <div className="aba-content">
            {loadingPagina ? (
              <div className="loading-spinner"><div className="loader"></div></div>
            ) : solicitacoes.length === 0 ? (
              <div className="empty-state">
                <span>📬</span>
                <p>Nenhuma solicitação pendente.</p>
              </div>
            ) : (
              <div className="lista-usuarios">
                {solicitacoes.map(s => (
                  <CardUsuario
                    key={s.amizade_id}
                    u={s}
                    acoes={
                      <div className="acoes-pendente">
                        <button
                          className="btn-aceitar"
                          onClick={() => handleResponder(s.amizade_id, true)}
                        >
                          ✓ Aceitar
                        </button>
                        <button
                          className="btn-recusar"
                          onClick={() => handleResponder(s.amizade_id, false)}
                        >
                          ✕
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Amizades