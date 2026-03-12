import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth'
import './Login.css'

const Login = () => {
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  
  const navigate = useNavigate()
  const { login } = useAuth()

  // Animação de entrada — limpa classes residuais do body antes de adicionar a nova
  useEffect(() => {
    // Remove qualquer classe de saída que possa ter ficado de navegações anteriores
    document.body.classList.remove('page-exit', 'page-transition-exit')
    document.body.classList.add('page-enter')

    return () => {
      document.body.classList.remove('page-enter')
    }
  }, [])

  const navigateWithExit = (path) => {
    document.body.classList.remove('page-enter')
    document.body.classList.add('page-exit')
    setTimeout(() => {
      document.body.classList.remove('page-exit')
      navigate(path)
    }, 300)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await authService.login(nome, senha)
    
    if (result.success) {
      navigateWithExit('/home')
      // login() chamado após a animação terminar
      setTimeout(() => login(result.user), 300)
    } else {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-background"></div>
      <div className="login-content slide-in-left">
        <div className="logo-container">
          <h1 className="glow-text">GAME - MMO</h1>
          <div className="underline-animation"></div>
        </div>
        
        <h2 className="fade-in">LOGIN</h2>
        
        {error && (
          <div className="error-message shake-animation">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="form-container">
          <div className={`input-group ${focusedField === 'nome' ? 'focused' : ''} ${nome ? 'filled' : ''}`}>
            <input
              type="text"
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onFocus={() => setFocusedField('nome')}
              onBlur={() => setFocusedField(null)}
              required
            />
            <label htmlFor="nome" className={nome ? 'filled' : ''}>
              <span className="label-text">Nome</span>
            </label>
            <div className="input-border"></div>
          </div>

          <div className={`input-group ${focusedField === 'senha' ? 'focused' : ''} ${senha ? 'filled' : ''}`}>
            <input
              type="password"
              id="senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onFocus={() => setFocusedField('senha')}
              onBlur={() => setFocusedField(null)}
              required
            />
            <label htmlFor="senha" className={senha ? 'filled' : ''}>
              <span className="label-text">Senha</span>
            </label>
            <div className="input-border"></div>
          </div>

          <div className="forgot-password-container">
            <button 
              type="button" 
              className="forgot-password-btn pulse-animation"
              onClick={() => navigateWithExit('/recuperar-senha')}
            >
              Esqueci minha senha?
            </button>
          </div>

          <button 
            type="submit" 
            className={`submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <div className="loader"></div>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="cadastro-link fade-in-delay">
          Não tem conta? <a
            href="/cadastro"
            className="link-animation"
            onClick={(e) => { e.preventDefault(); navigateWithExit('/cadastro') }}
          >
            Cadastrar-se
          </a>
        </p>
      </div>
    </div>
  )
}

export default Login