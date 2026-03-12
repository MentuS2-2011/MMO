import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth'
import { cookieUtils } from '../../utils/cookies'
import './Home.css'

const Home = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    // Definir saudação baseada na hora do dia
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Bom dia')
    else if (hour < 18) setGreeting('Boa tarde')
    else setGreeting('Boa noite')

    // Animação de entrada
    document.body.classList.add('home-enter')
    return () => {
      document.body.classList.remove('home-enter')
    }
  }, [])

  const handleLogout = async () => {
    await authService.logout(user.id)
    logout()
    navigate('/')
  }

  const navigateToProfile = () => {
    document.body.classList.add('page-exit')
    setTimeout(() => {
      document.body.classList.remove('page-exit')
      navigate('/perfil')
    }, 300)
  }

  return (
    <div className="home-container">
      {/* Background com efeito parallax */}
      <div className="home-background"></div>
      
      {/* Overlay para melhor legibilidade */}
      <div className="home-overlay"></div>
      
      {/* Conteúdo principal */}
      <div className="home-content">
        <header className="home-header">
          <div className="logo-section">
            <h1 className="game-logo">GAME - MMO</h1>
            <span className="online-indicator"></span>
          </div>
          
          <div className="user-section">
            <span className="greeting">{greeting},</span>
            <div className="profile-container">
              <button 
                className="profile-button"
                onClick={() => setShowMenu(!showMenu)}
              >
                <div className="profile-avatar">
                  {user?.foto_perfil ? (
                    <img src={user.foto_perfil} alt={user.nome} />
                  ) : (
                    <span className="avatar-initials">
                      {user?.nome?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="profile-name">{user?.nome}</span>
                <span className="profile-gold">{user?.gold} 💰</span>
              </button>
              
              {showMenu && (
                <div className="profile-menu">
                  <button onClick={navigateToProfile}>
                    <span>👤</span> Meu Perfil
                  </button>
                  <button onClick={() => navigate('/personagens')}>
                    <span>⚔️</span> Meus Personagens
                  </button>
                  <button onClick={() => navigate('/configuracoes')}>
                    <span>⚙️</span> Configurações
                  </button>
                  <div className="menu-divider"></div>
                  <button onClick={handleLogout} className="logout-btn">
                    <span>🚪</span> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="home-main">
          <div className="welcome-card">
            <h2>Bem-vindo ao mundo de MMO!</h2>
            <p>Escolha seu destino e comece sua aventura</p>
          </div>

          <div className="quick-actions">
            <button className="action-card" onClick={() => navigate('/jogar')}>
              <span className="action-icon">🎮</span>
              <h3>Jogar Agora</h3>
              <p>Entre no mundo do jogo</p>
            </button>

            <button className="action-card" onClick={() => navigate('/personagens')}>
              <span className="action-icon">⚔️</span>
              <h3>Personagens</h3>
              <p>Gerencie seus heróis</p>
            </button>

            <button className="action-card" onClick={() => navigate('/loja')}>
              <span className="action-icon">🏪</span>
              <h3>Loja</h3>
              <p>Compre itens e upgrades</p>
            </button>

            <button className="action-card" onClick={() => navigate('/ranking')}>
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
                <span className="activity-time">Último login</span>
                <p>{new Date(user?.ultimo_acesso).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </main>

        <footer className="home-footer">
          <p>© 2026 GAME - MMO. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  )
}

export default Home