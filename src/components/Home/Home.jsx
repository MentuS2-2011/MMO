import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import './Home.css'

const Home = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12)      setGreeting('Bom dia')
    else if (hour < 18) setGreeting('Boa tarde')
    else                setGreeting('Boa noite')

    // Limpa classes residuais e adiciona animação de entrada
    document.body.classList.remove('page-exit', 'page-transition-exit')
    document.body.classList.add('page-enter')
    return () => { document.body.classList.remove('page-enter') }
  }, [])

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (!showMenu) return
    const close = (e) => {
      if (!e.target.closest('.profile-container')) setShowMenu(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [showMenu])

  const navigateWithExit = (path) => {
    document.body.classList.remove('page-enter')
    document.body.classList.add('page-exit')
    setTimeout(() => {
      document.body.classList.remove('page-exit')
      navigate(path)
    }, 300)
  }

  const handleLogout = () => {
    logout()
    navigateWithExit('/')
  }

  const getInitials = (nome) => {
    if (!nome) return '?'
    return nome
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleString('pt-BR')
    } catch {
      return '—'
    }
  }

  return (
    <div className="home-container">
      {/* Background */}
      <div className="home-background"></div>
      <div className="home-overlay"></div>

      {/* Conteúdo */}
      <div className="home-content">

        {/* ── HEADER ── */}
        <header className="home-header">
          <div className="logo-section">
            <h1 className="game-logo">GAME - MMO</h1>
            <span className="online-indicator" title="Online"></span>
          </div>

          <div className="user-section">
            <span className="greeting">{greeting},</span>

            <div className="profile-container">
              <button
                className="profile-button"
                onClick={() => setShowMenu(prev => !prev)}
                aria-label="Menu do perfil"
              >
                <div className="profile-avatar">
                  {user?.foto_perfil
                    ? <img src={user.foto_perfil} alt={user.nome} />
                    : <span className="avatar-initials">{getInitials(user?.nome)}</span>
                  }
                </div>
                <span className="profile-name">{user?.nome}</span>
                <span className="profile-gold">⚜ {user?.gold ?? 0}</span>
              </button>

              {showMenu && (
                <div className="profile-menu">
                  <button onClick={() => { setShowMenu(false); navigateWithExit('/perfil') }}>
                    <span>👤</span> Meu Perfil
                  </button>
                  <button onClick={() => { setShowMenu(false); navigateWithExit('/personagens') }}>
                    <span>⚔️</span> Meus Personagens
                  </button>
                  <button onClick={() => { setShowMenu(false); navigateWithExit('/configuracoes') }}>
                    <span>⚙️</span> Configurações
                  </button>
                  <div className="menu-divider"></div>
                  <button className="logout-btn" onClick={handleLogout}>
                    <span>🚪</span> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main className="home-main">
          <div className="welcome-card">
            <h2>Bem-vindo ao mundo de MMO!</h2>
            <p>Escolha seu destino e comece sua aventura</p>
          </div>

          <div className="quick-actions">
            <button className="action-card" onClick={() => navigateWithExit('/jogar')}>
              <span className="action-icon">🎮</span>
              <h3>Jogar Agora</h3>
              <p>Entre no mundo do jogo</p>
            </button>

            <button className="action-card" onClick={() => navigateWithExit('/personagens')}>
              <span className="action-icon">⚔️</span>
              <h3>Personagens</h3>
              <p>Gerencie seus heróis</p>
            </button>

            <button className="action-card" onClick={() => navigateWithExit('/loja')}>
              <span className="action-icon">🏪</span>
              <h3>Loja</h3>
              <p>Compre itens e upgrades</p>
            </button>

            <button className="action-card" onClick={() => navigateWithExit('/ranking')}>
              <span className="action-icon">🏆</span>
              <h3>Ranking</h3>
              <p>Veja os melhores jogadores</p>
            </button>
          </div>

          <div className="recent-activity">
            <h3>Atividade Recente</h3>
            <div className="activity-list">
              <div className="activity-item">
                <span className="activity-time">Agora mesmo</span>
                <p>Bem-vindo de volta, {user?.nome}!</p>
              </div>
              <div className="activity-item">
                <span className="activity-time">Último acesso</span>
                <p>{formatDate(user?.ultimo_acesso)}</p>
              </div>
            </div>
          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer className="home-footer">
          <p>© {new Date().getFullYear()} GAME - MMO. Todos os direitos reservados.</p>
        </footer>

      </div>
    </div>
  )
}

export default Home