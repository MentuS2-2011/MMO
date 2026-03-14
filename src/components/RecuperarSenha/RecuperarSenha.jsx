import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth'
import { validators } from '../../utils/validators'
import './RecuperarSenha.css'

const RecuperarSenha = () => {
  const [etapa, setEtapa]                 = useState('email')    // email | codigo | novaSenha
  const [email, setEmail]                 = useState('')
  const [digitos, setDigitos]             = useState(['', '', '', ''])
  const [novaSenha, setNovaSenha]         = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState('')
  const [loading, setLoading]             = useState(false)
  const [focusedField, setFocusedField]   = useState(null)
  const [registroId, setRegistroId]       = useState(null)
  const [devCodigo, setDevCodigo]         = useState(null) // só em dev
  const [reenviarTimer, setReenviarTimer] = useState(0)
  const inputsRef = useRef([])
  const navigate  = useNavigate()

  useEffect(() => {
    document.body.classList.remove('page-exit', 'page-transition-exit')
    document.body.classList.add('page-enter')
    return () => document.body.classList.remove('page-enter')
  }, [])

  useEffect(() => {
    setError('')
    setSuccess('')
    setFocusedField(null)
  }, [etapa])

  // Countdown para "Reenviar código"
  useEffect(() => {
    if (reenviarTimer <= 0) return
    const t = setInterval(() => setReenviarTimer(prev => prev - 1), 1000)
    return () => clearInterval(t)
  }, [reenviarTimer])

  const navigateWithExit = (path) => {
    document.body.classList.remove('page-enter')
    document.body.classList.add('page-exit')
    setTimeout(() => {
      document.body.classList.remove('page-exit')
      navigate(path)
    }, 300)
  }

  // ── Etapa 1: enviar código ────────────────────────────────────────────────
  const handleEnviarCodigo = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await authService.enviarCodigoRecuperacao(email)

    if (result.success) {
      setSuccess('Código enviado! Verifique seu e-mail.')
      setReenviarTimer(60)
      if (result._devCodigo) setDevCodigo(result._devCodigo)
      setEtapa('codigo')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  // ── Inputs do código: navega automaticamente entre dígitos ───────────────
  const handleDigito = (index, valor) => {
    const novoValor = valor.replace(/\D/g, '').slice(-1) // só número, 1 char
    const novosDigitos = [...digitos]
    novosDigitos[index] = novoValor
    setDigitos(novosDigitos)
    setError('')

    if (novoValor && index < 3) {
      inputsRef.current[index + 1]?.focus()
    }

    // Auto-submit quando os 4 dígitos estiverem preenchidos
    if (novoValor && novosDigitos.every(d => d !== '')) {
      setTimeout(() => handleValidarCodigo(novosDigitos.join('')), 100)
    }
  }

  const handleDigitoKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digitos[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handleDigitoPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (paste.length === 4) {
      const novos = paste.split('')
      setDigitos(novos)
      inputsRef.current[3]?.focus()
      setTimeout(() => handleValidarCodigo(paste), 100)
    }
    e.preventDefault()
  }

  // ── Etapa 2: validar código ───────────────────────────────────────────────
  const handleValidarCodigo = async (codigoStr) => {
    const codigo = codigoStr || digitos.join('')
    if (codigo.length < 4) return

    setError('')
    setLoading(true)

    const result = await authService.validarCodigo(email, codigo)

    if (result.success) {
      setRegistroId(result.registroId)
      setEtapa('novaSenha')
    } else {
      setError(result.error)
      // Limpa os dígitos para nova tentativa
      setDigitos(['', '', '', ''])
      setTimeout(() => inputsRef.current[0]?.focus(), 100)
    }
    setLoading(false)
  }

  // ── Etapa 3: salvar nova senha ────────────────────────────────────────────
  const handleResetSenha = async (e) => {
    e.preventDefault()
    setError('')

    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem.')
      return
    }

    const { isValid, errors } = validators.isStrongPassword(novaSenha)
    if (!isValid) {
      setError('Senha fraca: ' + errors.join(', '))
      return
    }

    setLoading(true)
    const result = await authService.resetarSenha(email, registroId, novaSenha)

    if (result.success) {
      setSuccess('Senha alterada com sucesso!')
      setTimeout(() => navigateWithExit('/'), 1500)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const inputProps = (field, setter) => ({
    onFocus:  () => setFocusedField(field),
    onBlur:   () => setFocusedField(null),
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

        {/* ── Indicador de etapas ── */}
        <div className="etapas-indicator">
          {['email', 'codigo', 'novaSenha'].map((e, i) => (
            <React.Fragment key={e}>
              <div className={`etapa-dot ${etapa === e ? 'active' : ''} ${
                ['email','codigo','novaSenha'].indexOf(etapa) > i ? 'done' : ''
              }`}>
                {['email','codigo','novaSenha'].indexOf(etapa) > i ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`etapa-line ${
                ['email','codigo','novaSenha'].indexOf(etapa) > i ? 'done' : ''
              }`}></div>}
            </React.Fragment>
          ))}
        </div>

        {/* ─────────── ETAPA 1: E-MAIL ─────────── */}
        {etapa === 'email' && (
          <>
            <h2 className="fade-in">RECUPERAR SENHA</h2>
            <p className="info-text fade-in-delay">
              Digite o e-mail da sua conta para receber um código de 4 dígitos
            </p>

            {error   && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleEnviarCodigo} className="form-container">
              <div className={`input-group ${focusedField === 'email' ? 'focused' : ''} ${isFilled(email) ? 'filled' : ''}`}>
                <input
                  type="email"
                  id="email"
                  value={email}
                  required
                  {...inputProps('email', setEmail)}
                />
                <label htmlFor="email"><span className="label-text">E-mail</span></label>
                <div className="input-border"></div>
              </div>

              <button
                type="submit"
                className={`submit-btn ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? <div className="loader"></div> : 'Enviar Código'}
              </button>
            </form>
          </>
        )}

        {/* ─────────── ETAPA 2: CÓDIGO ─────────── */}
        {etapa === 'codigo' && (
          <>
            <h2 className="fade-in">INSERIR CÓDIGO</h2>
            <p className="info-text fade-in-delay">
              Enviamos um código de 4 dígitos para <strong>{email}</strong>
            </p>

            {/* Banner de dev */}
            {devCodigo && (
              <div className="dev-banner">
                🛠️ Modo dev — Código: <strong>{devCodigo}</strong>
              </div>
            )}

            {error   && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="codigo-inputs" onPaste={handleDigitoPaste}>
              {digitos.map((d, i) => (
                <input
                  key={i}
                  ref={el => inputsRef.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  className={`codigo-input ${error ? 'shake' : ''}`}
                  onChange={(e) => handleDigito(i, e.target.value)}
                  onKeyDown={(e) => handleDigitoKeyDown(i, e)}
                  autoFocus={i === 0}
                  disabled={loading}
                />
              ))}
            </div>

            {loading && (
              <div className="validando-text">
                <div className="loader-small"></div> Verificando código…
              </div>
            )}

            <div className="reenviar-container">
              {reenviarTimer > 0 ? (
                <p className="reenviar-timer">Reenviar código em {reenviarTimer}s</p>
              ) : (
                <button
                  type="button"
                  className="reenviar-btn"
                  onClick={() => setEtapa('email')}
                >
                  Não recebeu? Reenviar código
                </button>
              )}
            </div>
          </>
        )}

        {/* ─────────── ETAPA 3: NOVA SENHA ─────────── */}
        {etapa === 'novaSenha' && (
          <>
            <h2 className="fade-in">NOVA SENHA</h2>
            <p className="info-text fade-in-delay">
              Código verificado! Agora crie sua nova senha.
            </p>

            {error   && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleResetSenha} className="form-container">
              <div className={`input-group ${focusedField === 'novaSenha' ? 'focused' : ''} ${isFilled(novaSenha) ? 'filled' : ''}`}>
                <input
                  type="password"
                  id="novaSenha"
                  value={novaSenha}
                  required
                  {...inputProps('novaSenha', setNovaSenha)}
                />
                <label htmlFor="novaSenha"><span className="label-text">Nova Senha</span></label>
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
                <label htmlFor="confirmarSenha"><span className="label-text">Confirmar Senha</span></label>
                <div className="input-border"></div>

                {confirmarSenha && (
                  <span className={`senha-match ${novaSenha === confirmarSenha ? 'valid' : 'invalid'}`}>
                    {novaSenha === confirmarSenha ? '✓ Senhas coincidem' : '✗ Senhas não coincidem'}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className={`submit-btn ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? <div className="loader"></div> : 'Salvar Nova Senha'}
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