import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/supabase'
import { authService } from '../../services/auth'
import './Perfil.css'

const Perfil = () => {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  // Edição de perfil
  const [editMode, setEditMode]     = useState(false)
  const [nome, setNome]             = useState(user?.nome || '')
  const [descricao, setDescricao]   = useState(user?.descricao || '')
  const [nomeError, setNomeError]   = useState('')
  const [descError, setDescError]   = useState('')
  const [saving, setSaving]         = useState(false)

  // Foto
  const [fotoPerfil, setFotoPerfil]   = useState(user?.foto_perfil || '')
  const [showPhotoPopup, setShowPhotoPopup] = useState(false)
  const [photoUrl, setPhotoUrl]       = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl]   = useState('')
  const [uploading, setUploading]     = useState(false)

  // Conquistas
  const [conquistas, setConquistas]           = useState([])
  const [usuarioConquistas, setUsuarioConquistas] = useState([])
  const [selectedConquista, setSelectedConquista] = useState(null)
  const [loadingPage, setLoadingPage]         = useState(true)
  const [totalUsuarios, setTotalUsuarios]     = useState(1)
  const [porcentagemGlobal, setPorcentagemGlobal] = useState(0)

  // Feedback
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage]     = useState('')
  const [isMobile, setIsMobile]             = useState(window.innerWidth <= 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    document.body.classList.remove('page-exit', 'page-transition-exit')
    document.body.classList.add('page-enter')
    return () => document.body.classList.remove('page-enter')
  }, [])

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

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 3000)
  }
  const showError = (msg) => {
    setErrorMessage(msg)
    setTimeout(() => setErrorMessage(''), 4000)
  }

  // ── Conquistas ────────────────────────────────────────────────────────────
  const carregarConquistas = async () => {
    try {
      const { data: todas } = await supabase.from('conquistas').select('*').order('id')
      const { data: minhas } = await supabase
        .from('usuario_conquistas')
        .select('*')
        .eq('usuario_id', user.id)
      setConquistas(todas || [])
      setUsuarioConquistas(minhas || [])
    } catch (err) {
      console.error('Erro conquistas:', err)
    } finally {
      setLoadingPage(false)
    }
  }

  const contarTotalUsuarios = async () => {
    const { count } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
    setTotalUsuarios(count || 1)
  }

  const getConquistaProgresso = (id) =>
    usuarioConquistas.find(uc => uc.conquista_id === id) || { progresso: 0, completa: false }

  const carregarPorcentagemGlobal = async (id) => {
    const { count } = await supabase
      .from('usuario_conquistas')
      .select('*', { count: 'exact', head: true })
      .eq('conquista_id', id)
      .eq('completa', true)
    setPorcentagemGlobal(Math.round(((count || 0) / totalUsuarios) * 100))
  }

  // ── FOTO: abre galeria diretamente (sem popup intermediário) ─────────────
  // O botão de câmera chama handleClickFoto → dispara o input[type=file] nativo.
  // O input está no DOM mas invisível — não fica dentro do overlay do popup.
  const handleClickFoto = () => {
    // Reseta estado antes de abrir
    setSelectedFile(null)
    setPreviewUrl('')
    setPhotoUrl('')
    setErrorMessage('')
    // Dispara o seletor de arquivo nativo do sistema operacional / galeria
    fileInputRef.current?.click()
  }

  // Quando o usuário escolhe um arquivo
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['jpg','jpeg','png','webp','gif'].includes(ext)) {
      showError('Formato inválido. Use JPG, PNG, WebP ou GIF.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('Imagem muito grande. Máximo 5MB.')
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    // Abre popup só para mostrar preview e confirmar
    setPhotoUrl('')
    setShowPhotoPopup(true)

    // Limpa o valor do input para permitir selecionar o mesmo arquivo de novo
    e.target.value = ''
  }

  // Salva a foto (upload + banco)
  const handlePhotoSubmit = async () => {
    if (!selectedFile && !photoUrl) return

    setUploading(true)
    setErrorMessage('')

    try {
      let novaUrl = ''

      if (selectedFile) {
        // ── Upload do arquivo para Supabase Storage ──────────────────────
        const ext  = selectedFile.name.split('.').pop().toLowerCase()
        const path = `${user.id}/avatar.${ext}`

        // Remove avatar anterior do mesmo path (ignora erro 404)
        await supabase.storage.from('perfil').remove([path])

        const { error: uploadError } = await supabase.storage
          .from('perfil')
          .upload(path, selectedFile, { upsert: true, contentType: selectedFile.type })

        if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

        const { data: { publicUrl } } = supabase.storage
          .from('perfil')
          .getPublicUrl(path)

        // Timestamp para forçar reload do cache do browser
        novaUrl = `${publicUrl}?t=${Date.now()}`

      } else if (photoUrl) {
        // ── URL externa direta ────────────────────────────────────────────
        try { new URL(photoUrl) } catch { throw new Error('URL inválida.') }
        novaUrl = photoUrl
      }

      // ── Salva a URL no banco ──────────────────────────────────────────
      const { error: dbError } = await supabase
        .from('usuarios')
        .update({ foto_perfil: novaUrl })
        .eq('id', user.id)

      if (dbError) throw new Error(`Banco: ${dbError.message}`)

      // ── Atualiza estado local ─────────────────────────────────────────
      setFotoPerfil(novaUrl)
      updateUser({ foto_perfil: novaUrl })
      setShowPhotoPopup(false)
      setSelectedFile(null)
      setPreviewUrl('')
      showSuccess('Foto atualizada com sucesso!')

    } catch (err) {
      console.error('Erro ao salvar foto:', err)
      showError(err.message || 'Erro ao enviar foto. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const fecharPhotoPopup = () => {
    if (uploading) return
    setShowPhotoPopup(false)
    setSelectedFile(null)
    setPreviewUrl('')
    setPhotoUrl('')
  }

  // ── Salvar edição de perfil ────────────────────────────────────────────────
  const verificarNomeDisponivel = async (n) => {
    if (n === user.nome) return true
    const { data } = await supabase
      .from('usuarios')
      .select('id')
      .ilike('nome', n)
      .maybeSingle()
    return !data
  }

  const handleSalvar = async () => {
    setNomeError('')
    setDescError('')
    setErrorMessage('')
    setSaving(true)

    if (!nome.trim())     { setNomeError('Nome não pode estar vazio');         setSaving(false); return }
    if (nome.length < 3)  { setNomeError('Nome precisa ter ao menos 3 letras'); setSaving(false); return }
    if (descricao.length > 250) { setDescError('Máximo 250 caracteres');       setSaving(false); return }

    const disponivel = await verificarNomeDisponivel(nome.trim())
    if (!disponivel) { setNomeError('Este nome já está em uso'); setSaving(false); return }

    const { error } = await supabase
      .from('usuarios')
      .update({ nome: nome.trim(), descricao, ultimo_acesso: new Date() })
      .eq('id', user.id)

    if (error) {
      showError('Erro ao salvar. Tente novamente.')
    } else {
      updateUser({ nome: nome.trim(), descricao })
      setEditMode(false)
      showSuccess('Perfil atualizado com sucesso!')
    }
    setSaving(false)
  }

  const handleLogout = () => {
    logout()
    navigateWithExit('/')
  }

  const maskEmail = (email) => {
    if (!email) return ''
    const [local, domain] = email.split('@')
    if (local.length <= 3) return `${local}@${domain}`
    return `${local.slice(0, 3)}${'*'.repeat(local.length - 3)}@${domain}`
  }

  if (loadingPage) {
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

      {/*
        Input de arquivo FORA de qualquer overlay/popup.
        Fica invisível no DOM mas sempre acessível pelo ref.
        Isso evita que qualquer z-index ou pointer-events bloqueie o clique.
      */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

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
              <button className="cancel-button" onClick={() => { setEditMode(false); setNomeError(''); setDescError('') }}>
                Cancelar
              </button>
              <button className="save-button" onClick={handleSalvar} disabled={saving}>
                {saving ? '...' : 'Salvar'}
              </button>
            </div>
          )}
        </header>

        {/* Mensagens de feedback */}
        {successMessage && <div className="success-message">{successMessage}</div>}
        {errorMessage   && <div className="error-message">{errorMessage}</div>}

        <div className={`perfil-main ${isMobile ? 'mobile' : ''}`}>

          {/* ── Coluna Esquerda ── */}
          <div className="perfil-left">
            <div className="foto-section">
              <div className="foto-container">
                {fotoPerfil ? (
                  <img
                    src={fotoPerfil}
                    alt={user.nome}
                    className="foto-perfil"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      setFotoPerfil('')
                    }}
                  />
                ) : (
                  <div className="foto-placeholder">
                    {user.nome?.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Botão de câmera — chama handleClickFoto que dispara o input nativo */}
                <button
                  className="editar-foto-btn"
                  onClick={handleClickFoto}
                  title="Alterar foto da galeria"
                  type="button"
                >
                  📷
                </button>
              </div>
            </div>

            {!editMode ? (
              <div className="info-section">
                <h2>{user.nome}</h2>
                <p className="email-mask">{maskEmail(user.email)}</p>
                {user.descricao && <p className="descricao">{user.descricao}</p>}
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
                    onChange={e => { setNome(e.target.value); setNomeError('') }}
                    className={nomeError ? 'error' : ''}
                    placeholder="Seu nome"
                    maxLength={30}
                  />
                  {nomeError && <span className="error-text">{nomeError}</span>}
                </div>

                <div className="input-group">
                  <label>Email (não editável)</label>
                  <input type="email" value={maskEmail(user.email)} disabled className="disabled" />
                </div>

                <div className="input-group">
                  <label>Descrição</label>
                  <textarea
                    value={descricao}
                    onChange={e => { setDescricao(e.target.value.slice(0, 250)); setDescError('') }}
                    className={descError ? 'error' : ''}
                    rows="3"
                    placeholder="Conte um pouco sobre você..."
                  />
                  <div className="char-counter">{descricao.length}/250</div>
                  {descError && <span className="error-text">{descError}</span>}
                </div>
              </div>
            )}

            <button className="logout-button" onClick={handleLogout}>
              🚪 {isMobile ? '' : 'Sair da conta'}
            </button>
          </div>

          {/* ── Coluna Direita: Conquistas ── */}
          <div className="perfil-right">
            <h2>Conquistas ({usuarioConquistas.filter(uc => uc.completa).length}/{conquistas.length})</h2>
            <div className="conquistas-grid">
              {conquistas.map(c => {
                const prog = getConquistaProgresso(c.id)
                return (
                  <div
                    key={c.id}
                    className={`conquista-card ${prog.completa ? 'completa' : ''}`}
                    onClick={() => { setSelectedConquista(c); carregarPorcentagemGlobal(c.id) }}
                  >
                    <div className="conquista-icone">{c.icone}</div>
                    <div className="conquista-info">
                      <h4>{c.nome}</h4>
                      {!prog.completa && (
                        <div className="progresso-bar">
                          <div
                            className="progresso-fill"
                            style={{ width: `${Math.min((prog.progresso / (c.requisito_valor || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Popup: Conquista ── */}
        {selectedConquista && (
          <div className="conquista-popup" onClick={() => setSelectedConquista(null)}>
            <div className="popup-content" onClick={e => e.stopPropagation()}>
              <button className="close-popup" onClick={() => setSelectedConquista(null)}>×</button>
              <div className="popup-header">
                <span className="popup-icone">{selectedConquista.icone}</span>
                <h3>{selectedConquista.nome}</h3>
              </div>
              <p className="popup-descricao">{selectedConquista.descricao}</p>
              {(() => {
                const prog = getConquistaProgresso(selectedConquista.id)
                return (
                  <>
                    <div className="popup-progresso">
                      <div className="progresso-label">
                        <span>Seu progresso</span>
                        <span>{prog.progresso}/{selectedConquista.requisito_valor || 1}</span>
                      </div>
                      <div className="progresso-bar grande">
                        <div
                          className="progresso-fill"
                          style={{ width: `${Math.min((prog.progresso / (selectedConquista.requisito_valor || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="popup-global">
                      <h4>Estatísticas Globais</h4>
                      <div className="global-stats">
                        <div className="global-stat">
                          <span>Jogadores com esta conquista</span>
                          <span className="stat-value">{porcentagemGlobal}%</span>
                        </div>
                        <div className="global-bar">
                          <div className="global-fill" style={{ width: `${porcentagemGlobal}%` }} />
                        </div>
                      </div>
                    </div>
                    {prog.completa && prog.data_conquista && (
                      <div className="conquista-data">
                        Conquistada em: {new Date(prog.data_conquista).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* ── Popup: Foto (preview + confirmar) ── */}
        {showPhotoPopup && (
          <div className="photo-popup" onClick={fecharPhotoPopup}>
            <div className="popup-content" onClick={e => e.stopPropagation()}>
              <button className="close-popup" onClick={fecharPhotoPopup} disabled={uploading}>×</button>
              <h3>Alterar Foto de Perfil</h3>

              <div className="photo-options">
                {/* Preview da imagem selecionada */}
                {previewUrl && (
                  <div className="photo-preview">
                    <img src={previewUrl} alt="Preview" />
                  </div>
                )}

                {/* Opção: URL externa (caso não tenha selecionado arquivo) */}
                {!selectedFile && (
                  <div className="photo-option">
                    <label>Ou cole uma URL de imagem</label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/imagem.jpg"
                      value={photoUrl}
                      onChange={e => setPhotoUrl(e.target.value)}
                    />
                  </div>
                )}

                {/* Botão para trocar o arquivo selecionado */}
                {selectedFile && (
                  <p className="photo-hint">
                    📎 {selectedFile.name} &nbsp;
                    <button
                      className="trocar-btn"
                      type="button"
                      onClick={() => { setSelectedFile(null); setPreviewUrl(''); handleClickFoto() }}
                      disabled={uploading}
                    >
                      Trocar arquivo
                    </button>
                  </p>
                )}

                {errorMessage && <p className="error-text">{errorMessage}</p>}

                <div className="popup-actions">
                  <button onClick={fecharPhotoPopup} disabled={uploading}>
                    Cancelar
                  </button>
                  <button
                    className="primary"
                    onClick={handlePhotoSubmit}
                    disabled={(!selectedFile && !photoUrl) || uploading}
                  >
                    {uploading ? 'Enviando…' : 'Salvar Foto'}
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