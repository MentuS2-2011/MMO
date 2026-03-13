import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import Login from './components/Login/Login'
import Cadastro from './components/Cadastro/Cadastro'
import RecuperarSenha from './components/RecuperarSenha/RecuperarSenha'
import Home from './components/Home/Home'
import Perfil from './components/Perfil/Perfil'
import './App.css'

// Componente de rota protegida
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Carregando...</p>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/" />
}

// Componente de rota pública (redireciona para home se já estiver logado)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Carregando...</p>
      </div>
    )
  }
  
  return !user ? children : <Navigate to="/home" />
}

// Dashboard simples (mantido para compatibilidade)
const Dashboard = () => {
  const { user, logout } = useAuth()
  
  return (
    <div className="dashboard">
      <h1>Bem-vindo, {user?.nome}!</h1>
      <p>Gold: {user?.gold}</p>
      <button onClick={logout}>Sair</button>
    </div>
  )
}


// Página de personagens (placeholder)
const Personagens = () => {
  return (
    <div className="personagens-container">
      <h1>Meus Personagens</h1>
      <p>Em construção...</p>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rotas públicas - só acessíveis se NÃO estiver logado */}
          <Route path="/" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/cadastro" element={
            <PublicRoute>
              <Cadastro />
            </PublicRoute>
          } />
          <Route path="/recuperar-senha" element={
            <PublicRoute>
              <RecuperarSenha />
            </PublicRoute>
          } />

          {/* Rotas privadas - só acessíveis se estiver logado */}
          <Route path="/home" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/perfil" element={
            <PrivateRoute>
              <Perfil />
            </PrivateRoute>
          } />
          <Route path="/personagens" element={
            <PrivateRoute>
              <Personagens />
            </PrivateRoute>
          } />
          <Route path="/perfil" element={
            <PrivateRoute>
              <Perfil />
            </PrivateRoute>
          } />

          {/* Rota 404 - redireciona para página apropriada */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App