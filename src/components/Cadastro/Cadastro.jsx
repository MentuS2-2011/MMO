import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth'
import { validators } from '../../utils/validators'
import './Cadastro.css'

const Cadastro = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    errors: []
  })

  const navigate = useNavigate()

  // Animação de entrada — limpa classes residuais igual ao Login
  useEffect(() => {
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (name === 'senha') {
      setPasswordValidation(validators.isStrongPassword(value))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!passwordValidation.isValid) {
      setError('A senha não atende aos requisitos de segurança')
      return
    }

    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    // No handleSubmit, antes de chamar authService.cadastrar
    const nomeDisponivel = await verificarNomeDisponivel(formData.nome)
    if (!nomeDisponivel) {
      setError('Nome de usuário já está em uso')
      setLoading(false)
      return
    }

    const verificarNomeDisponivel = async (nome) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id')
      .eq('nome', nome)
      .single()
    return !data
  }

    const result = await authService.cadastrar(
      formData.nome,
      formData.email,
      formData.senha
    )

    if (result.success) {
      alert('Cadastro realizado com sucesso! Faça login para continuar.')
      navigateWithExit('/')
    } else {
      setError(result.error)
      setLoading(false)
    }
  }

  const senhaReqs = [
    { label: 'Mínimo 8 caracteres',     test: formData.senha.length >= 8 },
    { label: 'Uma letra maiúscula',      test: /[A-Z]/.test(formData.senha) },
    { label: 'Uma letra minúscula',      test: /[a-z]/.test(formData.senha) },
    { label: 'Um número',               test: /\d/.test(formData.senha) },
    { label: 'Um caractere especial',   test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?°ªº]/.test(formData.senha) },
  ]

  return (
    <div className="cadastro-container">
      <div className="cadastro-background"></div>
      <div className="cadastro-content slide-in-left">

        <div className="logo-container">
          <h1>GAME - MMO</h1>
          <div className="underline-animation"></div>
        </div>

        <h2 className="fade-in">CADASTRO</h2>

        {error && (
          <div className="error-message shake-animation">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-container">

          {/* Nome */}
          <div className={`input-group ${focusedField === 'nome' ? 'focused' : ''} ${formData.nome ? 'filled' : ''}`}>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              onFocus={() => setFocusedField('nome')}
              onBlur={() => setFocusedField(null)}
              required
            />
            <label htmlFor="nome">
              <span className="label-text">Nome</span>
            </label>
            <div className="input-border"></div>
          </div>

          {/* E-mail */}
          <div className={`input-group ${focusedField === 'email' ? 'focused' : ''} ${formData.email ? 'filled' : ''}`}>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              required
            />
            <label htmlFor="email">
              <span className="label-text">E-mail</span>
            </label>
            <div className="input-border"></div>
          </div>

          {/* Senha */}
          <div className={`input-group ${focusedField === 'senha' ? 'focused' : ''} ${formData.senha ? 'filled' : ''}`}>
            <input
              type="password"
              id="senha"
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              onFocus={() => setFocusedField('senha')}
              onBlur={() => setFocusedField(null)}
              required
            />
            <label htmlFor="senha">
              <span className="label-text">Senha</span>
            </label>
            <div className="input-border"></div>

            {formData.senha && (
              <div className="password-requirements">
                <p>Requisitos da senha:</p>
                <ul>
                  {senhaReqs.map((req) => (
                    <li key={req.label} className={req.test ? 'valid' : ''}>
                      {req.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Confirmar Senha */}
          <div className={`input-group ${focusedField === 'confirmarSenha' ? 'focused' : ''} ${formData.confirmarSenha ? 'filled' : ''}`}>
            <input
              type="password"
              id="confirmarSenha"
              name="confirmarSenha"
              value={formData.confirmarSenha}
              onChange={handleChange}
              onFocus={() => setFocusedField('confirmarSenha')}
              onBlur={() => setFocusedField(null)}
              required
            />
            <label htmlFor="confirmarSenha">
              <span className="label-text">Confirmar Senha</span>
            </label>
            <div className="input-border"></div>

            {/* Indicador de senhas coincidem */}
            {formData.confirmarSenha && (
              <span className={`senha-match ${formData.senha === formData.confirmarSenha ? 'valid' : 'invalid'}`}>
                {formData.senha === formData.confirmarSenha ? '✓ Senhas coincidem' : '✗ Senhas não coincidem'}
              </span>
            )}
          </div>

          <button
            type="submit"
            className={`submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? <div className="loader"></div> : 'Cadastrar-se'}
          </button>
        </form>

        <p className="login-link fade-in-delay">
          Já tem conta?{' '}
          <a
            href="/"
            className="link-animation"
            onClick={(e) => { e.preventDefault(); navigateWithExit('/') }}
          >
            Login
          </a>
        </p>
      </div>
    </div>
  )

  
}

export default Cadastro