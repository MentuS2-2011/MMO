# 🗡️ GAME - MMO

Frontend de autenticação e home para um projeto de jogo MMO, construído com **React + Vite + Supabase**.

---

## 📋 Sumário

- [Visão Geral](#visão-geral)
- [Stack](#stack)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração do Supabase](#configuração-do-supabase)
- [Rodando o Projeto](#rodando-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Fluxo de Autenticação](#fluxo-de-autenticação)
- [Persistência de Sessão (Cookies)](#persistência-de-sessão-cookies)
- [Rotas](#rotas)
- [Componentes](#componentes)
- [Banco de Dados](#banco-de-dados)
- [Assets](#assets)

---

## Visão Geral

Telas de autenticação completas (Login, Cadastro, Recuperar Senha) com persistência de sessão via cookies e uma Home screen inicial. O design segue uma identidade visual dark/fantasy com animações de transição suaves entre telas.

---

## Stack

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 19 | UI |
| Vite | 7 | Build/Dev server |
| React Router DOM | 6 | Roteamento SPA |
| Supabase JS | 2 | Backend/banco de dados |
| js-cookie | 3 | Gerenciamento de cookies |

---

## Estrutura de Pastas

```
src/
├── assets/
│   └── Wallpaper/
│       ├── Cenario-tela-login.jpg       ← fundo do Login
│       ├── Cenario-tela-login@2x.jpg    ← fundo do Login (retina)
│       ├── Cenario-tela-cadastro.jpg    ← fundo do Cadastro
│       ├── Cenario-tela-recuperar.jpg   ← fundo do RecuperarSenha
│       └── Cenario-home.jpg             ← fundo da Home (opcional)
│
├── components/
│   ├── Login/
│   │   ├── Login.jsx
│   │   └── Login.css
│   ├── Cadastro/
│   │   ├── Cadastro.jsx
│   │   └── Cadastro.css
│   ├── RecuperarSenha/
│   │   ├── RecuperarSenha.jsx
│   │   └── RecuperarSenha.css
│   ├── Home/
│   │   ├── Home.jsx
│   │   └── Home.css
│   └── Transition/
│       ├── PageTransition.jsx
│       └── PageTransition.css
│
├── contexts/
│   └── AuthContext.jsx      ← gerencia user, loading, login(), logout()
│
├── hooks/
│   └── useAuth.js           ← hook de atalho para o AuthContext
│
├── services/
│   ├── auth.js              ← toda lógica de autenticação com Supabase
│   └── supabase.js          ← instância do cliente Supabase
│
├── utils/
│   ├── cookies.js           ← helpers de cookie (js-cookie)
│   ├── validators.js        ← validação de senha + hash SHA-256
│   └── storage.js           ← helpers de localStorage
│
├── App.jsx                  ← roteamento + PrivateRoute + PublicRoute
├── App.css                  ← estilos globais (loading screen, dashboard)
├── index.css                ← reset global + fontes
└── main.jsx                 ← entry point
```

---

## Pré-requisitos

- **Node.js** `>=20.19.0` (exigido pelo Vite 7)
- **npm** `>=8`
- Uma conta e projeto criado no [Supabase](https://supabase.com)

---

## Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/gamemmo.git
cd gamemmo

# Instale as dependências
npm install
```

---

## Configuração do Supabase

### 1. Credenciais

Edite `src/services/supabase.js` com as credenciais do seu projeto:

```js
const supabaseUrl = 'https://SEU_PROJETO.supabase.co'
const supabaseKey = 'sua_anon_key_aqui'
```

> ⚠️ **Nunca commite chaves privadas.** Use variáveis de ambiente em produção:
> ```js
> const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
> const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
> ```
> E crie um arquivo `.env` na raiz (já está no `.gitignore`):
> ```
> VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
> VITE_SUPABASE_KEY=sua_anon_key_aqui
> ```

### 2. Tabelas necessárias no Supabase

Execute o SQL abaixo no **SQL Editor** do Supabase:

```sql
-- Tabela principal de usuários
CREATE TABLE usuarios (
  id            BIGSERIAL PRIMARY KEY,
  nome          TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  senha         TEXT NOT NULL,          -- SHA-256 hash
  gold          INTEGER DEFAULT 50,
  nivel         INTEGER DEFAULT 1,
  conquistas    INTEGER DEFAULT 0,
  foto_perfil   TEXT,                   -- URL da foto (opcional)
  session_token TEXT,                   -- token de sessão ativo
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  ultimo_acesso TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de tokens de recuperação de senha
CREATE TABLE recuperacao_senha (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  expira_em   TIMESTAMPTZ NOT NULL,
  usado       BOOLEAN DEFAULT FALSE,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_usuarios_session_token ON usuarios(session_token);
CREATE INDEX idx_usuarios_email         ON usuarios(email);
CREATE INDEX idx_recuperacao_token      ON recuperacao_senha(token);
```

### 3. Row Level Security (RLS)

Desabilite o RLS nas tabelas ou configure políticas adequadas. Para desenvolvimento, a forma mais simples é desabilitar:

```sql
ALTER TABLE usuarios         DISABLE ROW LEVEL SECURITY;
ALTER TABLE recuperacao_senha DISABLE ROW LEVEL SECURITY;
```

> Em produção, configure políticas RLS adequadas para proteger os dados.

---

## Rodando o Projeto

```bash
# Modo desenvolvimento (com hot reload)
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint
```

O servidor de desenvolvimento roda em `http://localhost:5173`.

---

## Funcionalidades

### ✅ Implementado

- **Login** com nome + senha
- **Cadastro** com validação de senha forte em tempo real
- **Recuperar Senha** em 3 etapas (email → token → nova senha)
- **Persistência de sessão** via cookies (`js-cookie`) — o usuário não precisa logar de novo ao fechar e reabrir o browser
- **Lembrar de mim** — checkbox no Login (marcado por padrão); desmarcado = cookie de sessão apenas
- **Proteção de rotas** — rotas privadas redirecionam para `/` se não autenticado; rotas públicas redirecionam para `/home` se já autenticado
- **Animações de transição** entre páginas (page-enter / page-exit no body)
- **Floating labels** nos inputs (idênticos em todas as telas)
- **Hash SHA-256** das senhas antes de salvar/comparar
- **Home screen** com header, menu dropdown do perfil, ações rápidas e atividade recente
- **Responsividade** completa (mobile, tablet, landscape)
- **Loading screen** temática enquanto restaura a sessão

### 🔜 Futuro

- Tela de Perfil (`/perfil`)
- Tela de Personagens (`/personagens`)
- Loja, Ranking, Mapa do mundo
- Upload de foto de perfil (Supabase Storage)
- Integração com serviço de e-mail para recuperação de senha (ex: Resend, SendGrid)

---

## Fluxo de Autenticação

```
Usuário abre o site
        │
        ▼
AuthProvider monta
        │
        ├─ Cookie "mmo_session" existe?
        │       │
        │       ├─ SIM → consulta Supabase (token válido?)
        │       │               │
        │       │               ├─ SIM  → setUser(data) → loading=false
        │       │               └─ NÃO  → remove cookie  → loading=false
        │       │
        │       └─ NÃO → loading=false
        │
        ▼
App renderiza rotas
        │
        ├─ user=null + rota "/" → Login
        └─ user≠null + rota "/" → redireciona para /home
```

---

## Persistência de Sessão (Cookies)

O sistema usa **dois cookies**:

| Cookie | Conteúdo | Validade |
|---|---|---|
| `mmo_session` | `session_token` (string aleatória gerada no login) | 30 dias (ou sessão) |
| `mmo_uid` | `id` do usuário | 30 dias (ou sessão) |

### Como funciona

1. **Login bem-sucedido** → `authService.login()` gera um `session_token` único e salva no banco → `AuthContext.login(user, rememberMe)` grava os cookies
2. **Próxima visita** → `AuthProvider` lê `mmo_session` → consulta `usuarios WHERE session_token = ?` → se válido, restaura o usuário sem pedir login
3. **Logout** → cookies removidos + `session_token` no banco zerado

### "Lembrar de mim" desmarcado

O cookie fica sem `expires` — comportamento de **cookie de sessão**: some automaticamente quando o browser fecha.

---

## Rotas

| Rota | Componente | Proteção |
|---|---|---|
| `/` | `Login` | Pública (redireciona para `/home` se logado) |
| `/cadastro` | `Cadastro` | Pública |
| `/recuperar-senha` | `RecuperarSenha` | Pública |
| `/home` | `Home` | **Privada** |
| `/perfil` | `Perfil` (placeholder) | **Privada** |
| `/personagens` | `Personagens` (placeholder) | **Privada** |
| `/dashboard` | `Dashboard` (legado) | **Privada** |
| `*` | — | Redireciona para `/` |

---

## Componentes

### `AuthProvider` (`src/contexts/AuthContext.jsx`)

Contexto global de autenticação. Expõe:

| Prop | Tipo | Descrição |
|---|---|---|
| `user` | `object \| null` | Dados do usuário logado |
| `loading` | `boolean` | `true` enquanto restaura sessão do cookie |
| `login(userData, rememberMe)` | `function` | Seta usuário + grava cookies |
| `logout()` | `function` | Limpa usuário + cookies + banco |
| `updateUser(fields)` | `function` | Atualiza campos do usuário no contexto |

### `useAuth` (`src/hooks/useAuth.js`)

```jsx
const { user, loading, login, logout, updateUser } = useAuth()
```

### `PrivateRoute` / `PublicRoute`

Definidos em `App.jsx`. Exibem loading screen enquanto `loading=true`, depois redirecionam conforme o estado de autenticação.

---

## Banco de Dados

### Tabela `usuarios`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `nome` | TEXT | Nome único do jogador |
| `email` | TEXT | E-mail único |
| `senha` | TEXT | Hash SHA-256 |
| `gold` | INTEGER | Moeda do jogo (padrão: 50) |
| `nivel` | INTEGER | Nível do personagem (padrão: 1) |
| `conquistas` | INTEGER | Total de conquistas |
| `foto_perfil` | TEXT | URL da foto |
| `session_token` | TEXT | Token da sessão ativa (null = deslogado) |
| `criado_em` | TIMESTAMPTZ | Data de cadastro |
| `ultimo_acesso` | TIMESTAMPTZ | Atualizado a cada login/restauração |

### Tabela `recuperacao_senha`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `usuario_id` | BIGINT | FK → `usuarios.id` |
| `token` | TEXT | Token aleatório enviado por e-mail |
| `expira_em` | TIMESTAMPTZ | Validade de 1 hora |
| `usado` | BOOLEAN | Impede reuso do token |

---

## Assets

Coloque os wallpapers em `src/assets/Wallpaper/`:

| Arquivo | Tela |
|---|---|
| `Cenario-tela-login.jpg` | Login e Home (fallback) |
| `Cenario-tela-login@2x.jpg` | Login em telas retina |
| `Cenario-tela-cadastro.jpg` | Cadastro |
| `Cenario-tela-recuperar.jpg` | Recuperar Senha |

Formatos suportados: `.jpg`, `.png`, `.webp`. Tamanho recomendado: **1920×1080px** mínimo.

---

## Design System

Todas as telas compartilham as mesmas variáveis CSS:

```css
--primary-color:  #ffd700   /* dourado */
--primary-hover:  #ffed4a
--bg-overlay:     rgba(0,0,0,0.85)
--text-primary:   #fff
--text-secondary: #ccc
--text-muted:     #999
--border-color:   #444
--error-color:    #ff6b6b
--error-bg:       rgba(255,0,0,0.1)
--shadow-color:   rgba(0,0,0,0.7)
```

---

*Feito com ⚔️ para GAME - MMO*