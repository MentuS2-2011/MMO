import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/supabase'
import { authService } from '../../services/auth'
import './Perfil.css'

const Perfil = () => {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  // Estados
  const [editMode, setEditMode] = useState(false)
  const [nome, setNome] = useState(user?.nome || '')
  const [descricao, setDescricao] = useState(user?.descricao || '')
  const [fotoPerfil, setFotoPerfil] = useState(user?.foto_perfil || '')
  const [showPhotoPopup, setShowPhotoPopup] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  
  // Estados para conquistas
  const [conquistas, setConquistas] = useState([])
  const [usuarioConquistas, setUsuarioConquistas] = useState([])
  const [selectedConquista, setSelectedConquista] = useState(null)
  const [loading, setLoading] = useState(true)
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [porcentagemGlobal, setPorcentagemGlobal] = useState(0)
  
  // Estados para validação
  const [nomeError, setNomeError] = useState('')
  const [descricaoError, setDescricaoError] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Detectar se é mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Animações de entrada/saída
  useEffect(() => {
    document.body.classList.remove('page-exit', 'page-transition-exit')
    document.body.classList.add('page-enter')
    return () => document.body.classList.remove('page-enter')
  }, [])

  // Carregar conquistas
  useEffect(() => {
    carregarConquistas()
    contarTotalUsuarios()
  }, [])

  const navigateWithExit = (path) => {
    document.body.classList.remove('page-enter')
    document.body.classList.add('page-exit')
    setTimeout(() => {
      document.body.classList.remove('page-exit')
      navigate(path)
    }, 300)
  }

  const carregarConquistas = async () => {
    try {
      // Buscar todas as conquistas
      const { data: todasConquistas, error: err1 } = await supabase
        .from('conquistas')
        .select('*')
        .order('id')

      if (err1) throw err1

      // Buscar conquistas do usuário
      const { data: conquistasUsuario, error: err2 } = await supabase
        .from('usuario_conquistas')
        .select('*')
        .eq('usuario_id', user.id)

      if (err2) throw err2

      setConquistas(todasConquistas || [])
      setUsuarioConquistas(conquistasUsuario || [])
    } catch (error) {
      console.error('Erro ao carregar conquistas:', error)
      setErrorMessage('Erro ao carregar conquistas')
    } finally {
      setLoading(false)
    }
  }

  const contarTotalUsuarios = async () => {
    try {
      const { count, error } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })

      if (error) throw error
      setTotalUsuarios(count || 1)
    } catch (error) {
      console.error('Erro ao contar usuários:', error)
      setTotalUsuarios(1)
    }
  }

  const getConquistaProgresso = (conquistaId) => {
    const uc = usuarioConquistas.find(uc => uc.conquista_id === conquistaId)
    return uc || { progresso: 0, completa: false }
  }

  const carregarPorcentagemGlobal = async (conquistaId) => {
    try {
      const { count, error } = await supabase
        .from('usuario_conquistas')
        .select('*', { count: 'exact', head: true })
        .eq('conquista_id', conquistaId)
        .eq('completa', true)

      if (error) throw error
      setPorcentagemGlobal(Math.round((count / totalUsuarios) * 100))
    } catch (error) {
      console.error('Erro ao calcular porcentagem:', error)
      setPorcentagemGlobal(0)
    }
  }

  const handleFotoClick = () => {
    setShowPhotoPopup(true)
    setPhotoUrl('')
    setSelectedFile(null)
    setPreviewUrl('')
    setErrorMessage('')
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validar tipo e tamanho
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Por favor, selecione uma imagem válida')
        return
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        setErrorMessage('A imagem não pode ter mais de 5MB')
        return
      }
      
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setPhotoUrl('') // Limpar URL se houver
    }
  }

  const handlePhotoSubmit = async () => {
    setUploading(true)
    setErrorMessage('')

    try {
      let fotoUrl = fotoPerfil

      if (selectedFile) {
        // Upload da imagem
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('perfil')
          .upload(filePath, selectedFile)

        if (uploadError) throw uploadError

        // Pegar URL pública
        const { data: urlData } = supabase.storage
          .from('perfil')
          .getPublicUrl(filePath)

        fotoUrl = urlData.publicUrl
      } else if (photoUrl) {
        // Validar URL
        try {
          new URL(photoUrl)
          fotoUrl = photoUrl
        } catch {
          throw new Error('URL inválida')
        }
      }

      if (fotoUrl && fotoUrl !== fotoPerfil) {
        const result = await authService.atualizarFotoPerfil(user.id, fotoUrl)
        if (result.success) {
          setFotoPerfil(fotoUrl)
          updateUser({ foto_perfil: fotoUrl })
          setSuccessMessage('Foto atualizada com sucesso!')
          setTimeout(() => setSuccessMessage(''), 3000)
          setShowPhotoPopup(false)
        } else {
          throw new Error(result.error)
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar foto:', error)
      setErrorMessage(error.message || 'Erro ao atualizar foto')
    } finally {
      setUploading(false)
    }
  }

  const verificarNomeDisponivel = async (nome) => {
    if (nome === user.nome) return true
    
    const { data, error } = await supabase
      .from('usuarios')
      .select('id')
      .eq('nome', nome)
      .single()

    return !data
  }

  const handleSalvar = async () => {
    setNomeError('')
    setDescricaoError('')
    setErrorMessage('')
    setSaving(true)

    // Validações
    if (!nome.trim()) {
      setNomeError('Nome não pode estar vazio')
      setSaving(false)
      return
    }

    if (nome.length < 3) {
      setNomeError('Nome deve ter pelo menos 3 caracteres')
      setSaving(false)
      return
    }

    if (descricao.length > 250) {
      setDescricaoError('Descrição não pode ter mais de 250 caracteres')
      setSaving(false)
      return
    }

    const nomeDisponivel = await verificarNomeDisponivel(nome)
    if (!nomeDisponivel) {
      setNomeError('Nome de usuário já está em uso')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ 
          nome, 
          descricao,
          ultimo_acesso: new Date()
        })
        .eq('id', user.id)

      if (error) throw error

      updateUser({ nome, descricao })
      setEditMode(false)
      setSuccessMessage('Perfil atualizado com sucesso!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Erro ao salvar:', error)
      setErrorMessage('Erro ao salvar alterações')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await authService.logout(user.id)
    logout()
    navigateWithExit('/')
  }

  // Mascarar email
  const maskEmail = (email) => {
    if (!email) return ''
    const [local, domain] = email.split('@')
    if (local.length <= 3) return `${local}@${domain}`
    const visiblePart = local.substring(0, 3)
    const maskedPart = '*'.repeat(local.length - 3)
    return `${visiblePart}${maskedPart}@${domain}`
  }

  if (loading) {
    return (
      <div className="perfil-loading">
        <div className="loader"></div>
        <p>Carregando perfil...</p>
      </div>
    )
  }

  return (
    <div className="perfil-container">
      <div className="perfil-background"></div>
      <div className="perfil-overlay"></div>

      <div className={`perfil-content ${isMobile ? 'mobile' : ''}`}>
        {/* Header */}
        <header className="perfil-header">
          <button className="back-button" onClick={() => navigateWithExit('/home')}>
            ← {isMobile ? '' : 'Voltar'}
          </button>
          <h1>Meu Perfil</h1>
          {!editMode ? (
            <button className="edit-button" onClick={() => setEditMode(true)}>
              {isMobile ? '✎' : '✎ Editar Perfil'}
            </button>
          ) : (
            <div className="edit-actions">
              <button className="cancel-button" onClick={() => setEditMode(false)}>
                Cancelar
              </button>
              <button 
                className="save-button" 
                onClick={handleSalvar}
                disabled={saving}
              >
                {saving ? '...' : 'Salvar'}
              </button>
            </div>
          )}
        </header>

        {/* Mensagens */}
        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}

        {/* Conteúdo principal */}
        <div className={`perfil-main ${isMobile ? 'mobile' : ''}`}>
          {/* Coluna esquerda - Foto e informações */}
          <div className="perfil-left">
            <div className="foto-section">
              <div className="foto-container">
                {fotoPerfil ? (
                  <img 
                    src={fotoPerfil} 
                    alt={user.nome} 
                    className="foto-perfil"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.style.display = 'none'
                      e.target.parentElement.innerHTML = `<div class="foto-placeholder">${user.nome?.charAt(0).toUpperCase()}</div>`
                    }}
                  />
                ) : (
                  <div className="foto-placeholder">
                    {user.nome?.charAt(0).toUpperCase()}
                  </div>
                )}
                <button className="editar-foto-btn" onClick={handleFotoClick}>
                  ✎
                </button>
              </div>
            </div>

            {!editMode ? (
              <div className="info-section">
                <h2>{user.nome}</h2>
                <p className="email-mask">{maskEmail(user.email)}</p>
                {user.descricao && (
                  <p className="descricao">{user.descricao}</p>
                )}
                <div className="stats">
                  <div className="stat">
                    <span className="stat-value">{user.gold || 0}</span>
                    <span className="stat-label">Gold</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">
                      {usuarioConquistas.filter(uc => uc.completa).length}
                    </span>
                    <span className="stat-label">Conquistas</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="edit-section">
                <div className="input-group">
                  <label>Nome</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className={nomeError ? 'error' : ''}
                    placeholder="Seu nome"
                  />
                  {nomeError && <span className="error-text">{nomeError}</span>}
                </div>

                <div className="input-group">
                  <label>Email (não editável)</label>
                  <input
                    type="email"
                    value={maskEmail(user.email)}
                    disabled
                    className="disabled"
                  />
                </div>

                <div className="input-group">
                  <label>Descrição</label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value.slice(0, 250))}
                    className={descricaoError ? 'error' : ''}
                    rows="3"
                    placeholder="Conte um pouco sobre você..."
                  />
                  <div className="char-counter">
                    {descricao.length}/250
                  </div>
                  {descricaoError && <span className="error-text">{descricaoError}</span>}
                </div>
              </div>
            )}

            <button className="logout-button" onClick={handleLogout}>
              🚪 {isMobile ? '' : 'Sair da conta'}
            </button>
          </div>

          {/* Coluna direita - Conquistas */}
          <div className="perfil-right">
            <h2>Conquistas</h2>
            <div className="conquistas-grid">
              {conquistas.map((conquista) => {
                const progresso = getConquistaProgresso(conquista.id)
                return (
                  <div
                    key={conquista.id}
                    className={`conquista-card ${progresso.completa ? 'completa' : ''}`}
                    onClick={() => {
                      setSelectedConquista(conquista)
                      carregarPorcentagemGlobal(conquista.id)
                    }}
                  >
                    <div className="conquista-icone">
                      {conquista.icone}
                    </div>
                    <div className="conquista-info">
                      <h4>{conquista.nome}</h4>
                      {!progresso.completa && (
                        <div className="progresso-bar">
                          <div 
                            className="progresso-fill"
                            style={{ width: `${(progresso.progresso / (conquista.requisito_valor || 1)) * 100}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Popup de conquista */}
        {selectedConquista && (
          <div className="conquista-popup" onClick={() => setSelectedConquista(null)}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-popup" onClick={() => setSelectedConquista(null)}>×</button>
              
              <div className="popup-header">
                <span className="popup-icone">{selectedConquista.icone}</span>
                <h3>{selectedConquista.nome}</h3>
              </div>

              <p className="popup-descricao">{selectedConquista.descricao}</p>

              {(() => {
                const progresso = getConquistaProgresso(selectedConquista.id)
                
                return (
                  <>
                    <div className="popup-progresso">
                      <div className="progresso-label">
                        <span>Seu progresso</span>
                        <span>
                          {progresso.progresso}/{selectedConquista.requisito_valor || 1}
                        </span>
                      </div>
                      <div className="progresso-bar grande">
                        <div 
                          className="progresso-fill"
                          style={{ width: `${(progresso.progresso / (selectedConquista.requisito_valor || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="popup-global">
                      <h4>Estatísticas Globais</h4>
                      <div className="global-stats">
                        <div className="global-stat">
                          <span className="stat-label">Jogadores com esta conquista</span>
                          <span className="stat-value">{porcentagemGlobal}%</span>
                        </div>
                        <div className="global-bar">
                          <div 
                            className="global-fill"
                            style={{ width: `${porcentagemGlobal}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {progresso.completa && progresso.data_conquista && (
                      <div className="conquista-data">
                        Conquistada em: {new Date(progresso.data_conquista).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Popup de foto */}
        {showPhotoPopup && (
          <div className="photo-popup" onClick={() => setShowPhotoPopup(false)}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-popup" onClick={() => setShowPhotoPopup(false)}>×</button>
              <h3>Alterar Foto de Perfil</h3>
              
              <div className="photo-options">
                <div className="photo-option">
                  <label>URL da Imagem</label>
                  <input
                    type="url"
                    placeholder="https://exemplo.com/imagem.jpg"
                    value={photoUrl}
                    onChange={(e) => {
                      setPhotoUrl(e.target.value)
                      setSelectedFile(null)
                      setPreviewUrl('')
                    }}
                  />
                </div>

                <div className="photo-option">
                  <label>Ou faça upload</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                  />
                  <small>Formatos: JPG, PNG, GIF • Máx: 5MB</small>
                </div>

                {previewUrl && (
                  <div className="photo-preview">
                    <img src={previewUrl} alt="Preview" />
                  </div>
                )}

                <div className="popup-actions">
                  <button onClick={() => setShowPhotoPopup(false)}>Cancelar</button>
                  <button 
                    onClick={handlePhotoSubmit}
                    disabled={(!photoUrl && !selectedFile) || uploading}
                    className="primary"
                  >
                    {uploading ? 'Enviando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Perfil