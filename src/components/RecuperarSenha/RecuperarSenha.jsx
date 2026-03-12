import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth'
import { validators } from '../../utils/validators'
import './RecuperarSenha.css'

const RecuperarSenha = () => {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [etapa, setEtapa] = useState('solicitar') // solicitar | token | novaSenha
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const navigate = useNavigate()

  // Animação de entrada — limpa classes residuais igual ao Login/Cadastro
  useEffect(() => {
    document.body.classList.remove('page-exit', 'page-transition-exit')
    document.body.classList.add('page-enter')
    return () => {
      document.body.classList.remove('page-enter')
    }
  }, [])

  // Reseta focusedField ao trocar de etapa
  useEffect(() => {
    setFocusedField(null)
    setError('')
  }, [etapa])

  const navigateWithExit = (path) => {
    document.body.classList.remove('page-enter')
    document.body.classList.add('page-exit')
    setTimeout(() => {
      document.body.classList.remove('page-exit')
      navigate(path)
    }, 300)
  }

  const handleSolicitar = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await authService.recuperarSenha(email)
    if (result.success) {
      setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.')
      setEtapa('token')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const handleToken = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setEtapa('novaSenha')
    setLoading(false)
  }

  const handleResetSenha = async (e) => {
    e.preventDefault()
    setError('')

    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem')
      return
    }

    const passwordValidation = validators.isStrongPassword(novaSenha)
    if (!passwordValidation.isValid) {
      setError('Senha fraca: ' + passwordValidation.errors.join(', '))
      return
    }

    setLoading(true)
    const result = await authService.resetarSenha(token, novaSenha)
    if (result.success) {
      alert('Senha alterada com sucesso! Faça login com sua nova senha.')
      navigateWithExit('/')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  // Helper para props de input flutuante
  const inputProps = (field, setter) => ({
    onFocus: () => setFocusedField(field),
    onBlur:  () => setFocusedField(null),
    onChange: (e) => setter(e.target.value),
  })

  const isFilled = (val) => val.length > 0

  return (
    <div className="recuperar-container">
      <div className="recuperar-background"></div>
      <div className="recuperar-content">

        <div className="logo-container">
          <h1>GAME - MMO</h1>
          <div className="underline-animation"></div>
        </div>

        {/* ── ETAPA 1: SOLICITAR ── */}
        {etapa === 'solicitar' && (
          <>
            <h2 className="fade-in">RECUPERAR SENHA</h2>
            <p className="info-text fade-in-delay">
              Digite seu e-mail para receber um link de recuperação
            </p>

            {error   && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleSolicitar} className="form-container">
              <div className={`input-group ${focusedField === 'email' ? 'focused' : ''} ${isFilled(email) ? 'filled' : ''}`}>
                <input
                  type="email"
                  id="email"
                  value={email}
                  required
                  {...inputProps('email', setEmail)}
                />
                <label htmlFor="email">
                  <span className="label-text">E-mail</span>
                </label>
                <div className="input-border"></div>
              </div>

              <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                {loading ? <div className="loader"></div> : 'Enviar'}
              </button>
            </form>
          </>
        )}

        {/* ── ETAPA 2: TOKEN ── */}
        {etapa === 'token' && (
          <>
            <h2 className="fade-in">VERIFICAR TOKEN</h2>
            <p className="info-text fade-in-delay">
              Verifique seu e-mail e digite o token de recuperação
            </p>

            {error   && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleToken} className="form-container">
              <div className={`input-group ${focusedField === 'token' ? 'focused' : ''} ${isFilled(token) ? 'filled' : ''}`}>
                <input
                  type="text"
                  id="token"
                  value={token}
                  required
                  {...inputProps('token', setToken)}
                />
                <label htmlFor="token">
                  <span className="label-text">Token de Recuperação</span>
                </label>
                <div className="input-border"></div>
              </div>

              <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                {loading ? <div className="loader"></div> : 'Verificar'}
              </button>
            </form>
          </>
        )}

        {/* ── ETAPA 3: NOVA SENHA ── */}
        {etapa === 'novaSenha' && (
          <>
            <h2 className="fade-in">NOVA SENHA</h2>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleResetSenha} className="form-container">
              <div className={`input-group ${focusedField === 'novaSenha' ? 'focused' : ''} ${isFilled(novaSenha) ? 'filled' : ''}`}>
                <input
                  type="password"
                  id="novaSenha"
                  value={novaSenha}
                  required
                  {...inputProps('novaSenha', setNovaSenha)}
                />
                <label htmlFor="novaSenha">
                  <span className="label-text">Nova Senha</span>
                </label>
                <div className="input-border"></div>
              </div>

              <div className={`input-group ${focusedField === 'confirmarSenha' ? 'focused' : ''} ${isFilled(confirmarSenha) ? 'filled' : ''}`}>
                <input
                  type="password"
                  id="confirmarSenha"
                  value={confirmarSenha}
                  required
                  {...inputProps('confirmarSenha', setConfirmarSenha)}
                />
                <label htmlFor="confirmarSenha">
                  <span className="label-text">Confirmar Nova Senha</span>
                </label>
                <div className="input-border"></div>

                {confirmarSenha && (
                  <span className={`senha-match ${novaSenha === confirmarSenha ? 'valid' : 'invalid'}`}>
                    {novaSenha === confirmarSenha ? '✓ Senhas coincidem' : '✗ Senhas não coincidem'}
                  </span>
                )}
              </div>

              <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                {loading ? <div className="loader"></div> : 'Alterar Senha'}
              </button>
            </form>
          </>
        )}

        <p className="voltar-link fade-in-delay">
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); navigateWithExit('/') }}
          >
            ← Voltar para o Login
          </a>
        </p>

      </div>
    </div>
  )
}

export default RecuperarSenha