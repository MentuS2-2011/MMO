import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'

import Login          from './components/Login/Login'
import Cadastro       from './components/Cadastro/Cadastro'
import RecuperarSenha from './components/RecuperarSenha/RecuperarSenha'
import Home           from './components/Home/Home'
import Perfil         from './components/Perfil/Perfil'
import Amizades       from './components/Amizades/Amizades'

import './App.css'

// ── Rota privada: se não logado → vai para Login ──────────────────────────
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">GAME - MMO</div>
        <div className="loading-spinner-ring"></div>
        <p className="loading-text">Carregando…</p>
      </div>
    )
  }

  return user ? children : <Navigate to="/" replace />
}

// ── Rota pública: se já logado → vai para Home ────────────────────────────
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/home" replace /> : children
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Públicas */}
          <Route path="/"                element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/cadastro"        element={<PublicRoute><Cadastro /></PublicRoute>} />
          <Route path="/recuperar-senha" element={<PublicRoute><RecuperarSenha /></PublicRoute>} />

          {/* Privadas */}
          <Route path="/home"      element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/perfil"    element={<PrivateRoute><Perfil /></PrivateRoute>} />
          <Route path="/amizades"  element={<PrivateRoute><Amizades /></PrivateRoute>} />

          {/* Legado / fallback */}
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App